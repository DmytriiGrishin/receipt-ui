import WebApp from '@twa-dev/sdk'

export function getInitData(): string {
  return WebApp.initData || ''
}

export function getUserId(): string {
  const user = WebApp.initDataUnsafe?.user
  return user?.id?.toString() || '0'
}

export function getUserName(): string {
  const user = WebApp.initDataUnsafe?.user
  if (user?.first_name && user?.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  return user?.first_name || 'User'
}

export function initTelegram() {
  WebApp.ready()
  WebApp.expand()
  WebApp.enableClosingConfirmation()
}
