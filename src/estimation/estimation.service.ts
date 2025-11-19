import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EstimationMethod, SessionStatus } from "@prisma/client";
import { PrismaService } from "@src/prisma/prisma.service";
import { CreateSessionDto } from "./dto/create-session.dto";
import { RevealVotesDto } from "./dto/reveal-votes.dto";
import { NewRoundDto } from "./dto/new-round.dto";
import { FinalizeEstimationDto } from "./dto/finalize-estimation.dto";
import { SubmitVoteDto } from "./dto/submit-vote.dto";


@Injectable()
export class EstimationService{
    constructor(private readonly prisma: PrismaService) {}


    //helpers
    private getDefaultSequence(method: EstimationMethod):string[] {
        switch (method){
            case EstimationMethod.FIBONACCI:
                return['1','2','3','5','8','13','21','?'];
            case EstimationMethod.TSHIRT:
                return['XS','S','M','L','XL','XXL','?'];
            case EstimationMethod.POWERS_OF_TWO:
                return['1','2','4','8','16','32','?'];
            default:
                return['1','2','3','5','8','13','21','?'];
        }
    }

    private async ensureProjectMember(projectId:string, userId: string): Promise<void> {
        const isMember = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    {ownerId: userId},
                    {
                        members: {
                            some: {
                                userId,
                                isActive: true
                            }
                        }
                    },
                ],
            },
        });
        
        if (!isMember) {
            throw new ForbiddenException('No eres un miembro de este proyecto');
        }
    } 

    private async ensureModerator(sessionId:string, userId:string): Promise<void>{
        const session = await this.prisma.estimationSession.findUnique({
            where: {id: sessionId},
            select: {moderatorId: true},
        });

        if (!session){
            throw new NotFoundException('Sesion no encontrada');
        }
        if (session.moderatorId !== userId) {
            throw new ForbiddenException('Solo el moderador puede realizar esta acción')
        }
    }

    private isValidVote(voteValue: string, sequence: string[]): boolean {
        return sequence.includes(voteValue);
    }

    //crear una sesion
    async createSession(createSessionDto:CreateSessionDto, userId: string) {
        const {projectId, name, storyId, method, customSequence} = createSessionDto;

        //validaciones
        await this.ensureProjectMember(projectId, userId);
        const member = await this.prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
        });

        const project = await this.prisma.project.findUnique({
            where: {id: projectId},
            select: {ownerId: true},
        });

        const isOwner = project?.ownerId === userId;
        const isScrumMaster = member?.role === 'SCRUM_MASTER';

        if (!isOwner && !isScrumMaster) {
            throw new ForbiddenException('Solo el Scrum master y el dueño del proyecto pueden crear sesiones de estimación')
        }

        const story= await this.prisma.userStory.findUnique({
            where: {id: storyId},
            select: {projectId:true, code:true, title:true},
        });
        if (!story) {
            throw new NotFoundException('Historia de Usuario no encontrada');
        }
        if(story.projectId !== projectId) {
            throw new BadRequestException('La historia no pertenece a este proyecto')
        }

        //secuencia
        const sequence = customSequence || this.getDefaultSequence(method);

        //creacion de la sesion en estado inicial
        const session = await this.prisma.estimationSession.create({
            data: {
                projectId,
                name,
                storyId,
                method,
                sequence: sequence,
                moderatorId: userId,
                status:SessionStatus.DRAFT,
                isRevealed: false,
            },
            include: {
                story: {
                    select: {
                        id:true,
                        code:true,
                        title:true,
                        asA:true,
                        iWant:true,
                        soThat:true,
                        acceptanceCriteria:true,
                        priority:true,
                    },
                },
                moderator: {
                    select: {
                        id:true,
                        username:true,
                        firstName:true,
                        lastName:true
                    },
                },
                project: {
                    select: {
                        id:true,
                        name:true,
                        code:true,
                    },
                },
            },
        });

        return {
            id: session.id,
            projectId: session.projectId,
            name: session.name,
            status: session.status,
            method: session.method,
            sequence: session.sequence,
            isRevealed: session.isRevealed,
            story: session.story,
            moderator: session.moderator,
            project: session.project,
            createdAt: session.createdAt,
        };
    }

    //enviar votos
    async submitVote(sessionId: string, submitVoteDto: SubmitVoteDto, userId: string){
        const { voteValue, roundNumber, justification } = submitVoteDto;
        //validaciones
        const session = await this.prisma.estimationSession.findUnique({
            where: { id: sessionId },
            include: {
                project: {
                    select: { id: true },
                },
            },
        });
        if (!session) {
            throw new NotFoundException('Sesión de estimación no encontrada');
        }
        if (session.status === SessionStatus.CLOSED) {
            throw new BadRequestException('No se puede votar con la sesión cerrada');
        }
        await this.ensureProjectMember(session.project.id, userId);
        const sequence = session.sequence as string[];
        if (!this.isValidVote(voteValue, sequence)) {
            throw new BadRequestException(
                `Valor del voto invalido. Valores permitidos: ${sequence.join(', ')}`,
            );
        }
        const existingVote = await this.prisma.estimationVote.findUnique({
            where: {
                sessionId_userId_roundNumber: {
                    sessionId,
                    userId,
                    roundNumber,
                },
            },
        });
        if (existingVote) {
            throw new BadRequestException(`Ya votaste en la ronda ${roundNumber}`);
        }
        //crear voto
        const vote = await this.prisma.estimationVote.create({
            data: {
                sessionId,
                userId,
                voteValue,
                roundNumber,
                justification,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        //cambiar a activo si es primer voto de la ronda
        if (session.status === SessionStatus.DRAFT) {
            await this.prisma.estimationSession.update({
                where: { id: sessionId },
                data: {
                    status: SessionStatus.ACTIVE,
                    startedAt: new Date,
                },
            });
        }
        return {
            id: vote.id,
            sessionId: vote.sessionId,
            voteValue: vote.voteValue,
            roundNumber: vote.roundNumber,
            justification: vote.justification,
            votedAt: vote.votedAt,
            user: vote.user,
        };
    }

    //revelar los votos
    async revealVotes(sessionId:string, revealVotesDto:RevealVotesDto, userId: string){
        const { roundNumber } = revealVotesDto;
        //validaciones
        await this.ensureModerator(sessionId, userId);

        const session = await this.prisma.estimationSession.findUnique({
            where: { id: sessionId},
        });
        if (!session) {
            throw new NotFoundException('Sesión no encontrada')
        }
        //sacar los votos
        const votes = await this.prisma.estimationVote.findMany({
            where: {
                sessionId,
                roundNumber,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (votes.length === 0){
            throw new BadRequestException(`No se encotraron votos en la ronda ${roundNumber}`);
        }
        //actualizar props de la sesion
        await this.prisma.estimationSession.update({
            where: {id: sessionId},
            data: {isRevealed:true},
        });

        //estadisticas utiles 
        const voteValues= votes.map((v) => v.voteValue);
        const uniqueValues = [...new Set(voteValues)];
        const hasConsensus = uniqueValues.length === 1;

        const numericVotes = voteValues.filter((v) => v !== '?');
        const hasNumericConsensus = new Set(numericVotes).size === 1 && numericVotes.length > 0;

        return {
            sessionId,
            roundNumber,
            isRevealed: true,
            votes: votes.map((v) => ({
                id: v.id,
                voteValue: v.voteValue,
                user: v.user,
                justification: v.justification,
                votedAt: v.votedAt,
            })),
            statistics: {
            totalVotes: votes.length,
            uniqueValues: uniqueValues.length,
            hasConsensus,
            hasNumericConsensus,
            distribution: voteValues.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
            }, {} as Record<string, number>),
            },
        }; 
    }

    //crear una nueva ronda
    async startNewRound(sessionId:string, newRoundDto: NewRoundDto, userId: string) {
        const { newRoundNumber, reason } = newRoundDto;
        //validaciones
        await this.ensureModerator(sessionId, userId);

        const session = await this.prisma.estimationSession.findUnique({
            where: { id:sessionId},
        });
        if (!session) {
            throw new NotFoundException('Sesión no encontrada');
        }

        if (!session.isRevealed) {
            throw new BadRequestException('No se puede empezar una nueva ronda sin revelar los votos de la anterior');
        }

        const maxRound = await this.prisma.estimationVote.findFirst({
            where: { sessionId },
            orderBy: { roundNumber: 'desc'},
            select: { roundNumber: true },
        });
        const expectedRound = (maxRound?.roundNumber || 1) + 1;
        if (newRoundNumber !== expectedRound) {
            throw new BadRequestException(
                `Numero de ronda invalido. Se esperaba ${expectedRound}`
            );
        }
        //actualizar la sesion
        await this.prisma.estimationSession.update({
            where: { id: sessionId },
            data: {
                isRevealed: false,
                currentRound: newRoundNumber,
            },
        });

        return {
            sessionId,
            newRoundNumber,
            reason,
            isRevealed: false,
            currentRound: newRoundNumber,
            message: `Comenzó la ronda ${newRoundNumber}. Los miembros pueden votar otra vez`
        }
    }

    //finalizar la estimacion
    async finalizeEstimation(
        sessionId: string,
        finalizeDto: FinalizeEstimationDto,
        userId: string
    ) {
        const { finalEstimation, estimateHours, notes } = finalizeDto;
        
        await this.ensureModerator(sessionId, userId);
        const session = await this.prisma.estimationSession.findUnique({
            where: {id:sessionId},
            include: {
                story:true,
            },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (session.status === SessionStatus.CLOSED) {
            throw new BadRequestException('La sesión está cerrada');
        }

        const sequence = session.sequence as string[];
        if (!this.isValidVote(finalEstimation, sequence)) {
            throw new BadRequestException(`Valor de estimacion invalido. Los valores aceptados son: ${sequence.join(', ')}`);
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const updatedSession = await tx.estimationSession.update({
                where: { id: sessionId },
                data: {
                finalEstimation,
                status: SessionStatus.CLOSED,
                completedAt: new Date(),
                },
                include: {
                story: {
                    select: {
                    id: true,
                    code: true,
                    title: true,
                    estimateHours: true,
                    },
                },
                moderator: {
                    select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    },
                },
                },
            });
            // Actualizar los story points en la historia
            const updatedStory = await tx.userStory.update({
                where: { id: session.storyId! },
                data: { estimateHours },
            });
            return { updatedSession, updatedStory };
        });

        return {
            id: result.updatedSession.id,
            sessionId,
            finalEstimation,
            estimateHours,
            notes,
            status: SessionStatus.CLOSED,
            completedAt: result.updatedSession.completedAt,
            story: {
                id: result.updatedStory.id,
                code: result.updatedStory.code,
                title: result.updatedStory.title,
                previousEstimate: result.updatedSession.story?.estimateHours,
                newEstimate: estimateHours,
            },
            moderator: result.updatedSession.moderator,
            message: 'Estimacion finalizada con éxito. Se actualizarion los puntos de historia',
        };
    }

    //consultas

    async getSessionDetails(sessionId: string, userId: string){
        const session = await this.prisma.estimationSession.findUnique({
        where: { id: sessionId },
        include: {
            story: {
            select: {
                id: true,
                code: true,
                title: true,
                asA: true,
                iWant: true,
                soThat: true,
                acceptanceCriteria: true,
                description: true,
                priority: true,
                businessValue: true,
                estimateHours: true,
            },
            },
            moderator: {
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
            },
            },
            project: {
            select: {
                id: true,
                name: true,
                code: true,
            },
            },
        },
        });
        if (!session) {
            throw new NotFoundException('Sesion no encontrada')
        }
        await this.ensureProjectMember(session.projectId, userId);

        const currentRound = session.currentRound;
        let votes: Array<{
        id: string;
        voteValue: string;
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
        };
        justification: string | null;
        votedAt: Date;
        }> = [];
        if (session.isRevealed || session.moderatorId === userId) {
            const voteRecords = await this.prisma.estimationVote.findMany({
                where: {
                    sessionId,
                    roundNumber: currentRound,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { votedAt: 'asc' },
            });

            votes = voteRecords.map((v) => ({
                id: v.id,
                voteValue: v.voteValue,
                user: v.user,
                justification: v.justification,
                votedAt: v.votedAt,
            }));
        }
        const userVote = await this.prisma.estimationVote.findUnique({
            where: {
                sessionId_userId_roundNumber: {
                sessionId,
                userId,
                roundNumber: currentRound,
                },
            },
        });

        const acceptanceCriteria = session.story?.acceptanceCriteria
            ?.split('\n')
            .map((item) => item.trim())
            .filter((item) => item.length > 0) || [];
        return {
            id: session.id,
            name: session.name,
            status: session.status,
            method: session.method,
            sequence: session.sequence,
            isRevealed: session.isRevealed,
            finalEstimation: session.finalEstimation,
            currentRound,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            createdAt: session.createdAt,
            moderator: session.moderator,
            project: session.project,
            story: session.story ? {
                ...session.story,
                acceptanceCriteria,
            } : null,
            votes: session.isRevealed ? votes : [],
            userHasVoted: !!userVote,
            userVote: userVote ? {
                voteValue: userVote.voteValue,
                justification: userVote.justification,
            } : null,
            isModerator: session.moderatorId === userId,
        };
    }

    async listProjectSessions(projectId: string, userId: string) {
        await this.ensureProjectMember(projectId, userId);
        const sessions = await this.prisma.estimationSession.findMany({
            where: { projectId },
            include: {
                story: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                    },
                },
                moderator: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                _count: {
                    select: {
                        votes: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return sessions.map((session) => ({
            id: session.id,
            name: session.name,
            status: session.status,
            method: session.method,
            finalEstimation: session.finalEstimation,
            story: session.story,
            moderator: session.moderator,
            totalVotes: session._count.votes,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            createdAt: session.createdAt,
        }));
    }

    async getVotingHistory(sessionId: string, userId: string) {
        const session = await this.prisma.estimationSession.findUnique({
            where: { id: sessionId },
            select: {
                projectId: true,
                status: true,
            },
        });
        if (!session) {
        throw new NotFoundException('Sesion no encontrada');
        }

    
        await this.ensureProjectMember(session.projectId, userId);
        const votes = await this.prisma.estimationVote.findMany({
            where: { sessionId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: [{ roundNumber: 'asc' }, { votedAt: 'asc' }],
        });

        const votesByRound = votes.reduce((acc, vote) => {
            const round = vote.roundNumber;
            if (!acc[round]) {
                acc[round] = [];
            }
            acc[round].push({
                id: vote.id,
                voteValue: vote.voteValue,
                user: vote.user,
                justification: vote.justification,
                votedAt: vote.votedAt,
            });
            return acc;
        }, {} as Record<number, any[]>);

        const rounds = Object.keys(votesByRound).map((roundKey) => {
            const roundNumber = parseInt(roundKey);
            const roundVotes = votesByRound[roundNumber];
            const voteValues = roundVotes.map((v) => v.voteValue);
            const uniqueValues = [...new Set(voteValues)];
            
            return {
                roundNumber,
                votes: roundVotes,
                statistics: {
                    totalVotes: roundVotes.length,
                    uniqueValues: uniqueValues.length,
                    hasConsensus: uniqueValues.length === 1,
                    distribution: voteValues.reduce((acc, val) => {
                        acc[val] = (acc[val] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>),
                },
            };
        });

        return {
            sessionId,
            status: session.status,
            totalRounds: rounds.length,
            rounds,
        };
    }
}