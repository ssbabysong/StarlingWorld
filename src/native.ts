import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const isNative = Capacitor.isNativePlatform()

export function setupNativeChrome(): void {
  if (!isNative) return
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  if (Capacitor.getPlatform() === 'android') {
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
  }
}

export function tap(style: 'light' | 'medium' = 'light'): void {
  if (!isNative) return
  Haptics.impact({ style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium }).catch(() => {})
}

export function success(): void {
  if (!isNative) return
  Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}

/** Saves a text file: share sheet on device, download in the browser. */
export async function shareTextFile(fileName: string, text: string): Promise<void> {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title: fileName, files: [uri] })
    return
  }
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName
  a.click()
  URL.revokeObjectURL(a.href)
}
