import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OAuthGHService {
  async githubAuth(code: string): Promise<any> {
    console.log('CODE IN SERVICE:', code);
    const clientId = process.env.CLIENT_ID_GITHUB;
    const clientSecret = process.env.CLIENT_SECRET_GITHUB;
    const redirectUri = process.env.REDIRECT_URI_GITHUB;

    if (!clientId || !clientSecret) {
      throw new HttpException(
        'GitHub OAuth credentials not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (tokenResponse.data.error) {
        throw new HttpException(
          `GitHub OAuth error: ${tokenResponse.data.error_description}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return tokenResponse.data;
    } catch (error) {
      console.error(
        'GitHub Auth Error:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Failed to authenticate with GitHub',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getGitHubUserData(accessToken: string): Promise<any> {
    if (!accessToken) {
      throw new HttpException(
        'Access token is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${accessToken}`,
          'User-Agent': 'YourApp/1.0',
        },
      });

      return userResponse.data;
    } catch (error) {
      console.error(
        'GitHub User Data Error:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Failed to fetch user data from GitHub',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
