// utils/TokenService.js

export function scheduleTokenRefresh(refreshTokenExpired) {
  const currentTime = Math.floor(Date.now() / 1000); // Текущее время в секундах
  const timeUntilExpiration = refreshTokenExpired - currentTime;

  console.log(`Current time: ${currentTime}`);
  console.log(`Token expiration time: ${refreshTokenExpired}`);
  console.log(`Time until expiration: ${timeUntilExpiration} seconds`);

  if (timeUntilExpiration > 0) {
      console.log(`Scheduling token refresh in ${(timeUntilExpiration - 60)} seconds`);

      // Обновляем токен за 1 минуту до истечения
      setTimeout(() => {
          console.log('Refreshing token now...');
          refreshAccessToken();
      }, (timeUntilExpiration - 60) * 1000);
  } else {
      console.log('Token is already expired, refreshing now...');
      // Если токен уже истек, сразу обновляем
      refreshAccessToken();
  }
}

async function refreshAccessToken() {
  try {
      console.log('Attempting to refresh access token...');

      const userId = localStorage.getItem('userId');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!userId || !refreshToken) {
          throw new Error('Missing user credentials');
      }

      const response = await axios.post('/api/auth/refresh-token', null, {
          params: {
              value: refreshToken,
              userId: userId
          }
      });

      console.log('Token refreshed successfully');

      // Сохраняем новые токены
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshTokenValue);

      // Перезапускаем таймер
      scheduleTokenRefresh(response.data.refreshTokenExpired);

  } catch (error) {
      console.error('Failed to refresh token', error);
  }
}
