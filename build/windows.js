// Based on https://www.christianengvall.se/electron-windows-installer/

const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer...')
  const rootPath = path.resolve('./')
  const outPath = path.join(rootPath, 'out')

  return Promise.resolve({
    appDirectory: path.join(outPath, 'Verbose Guacamole-win32-x64/'),
    authors: 'Benjamin Hollon',
    noMsi: true,
    outputDirectory: outPath,
    exe: 'Verbose Guacamole.exe',
    setupExe: 'VerbGuac-installer-win32-x64.exe',
    setupIcon: path.join(rootPath, 'icons', 'icon.ico')
  })
}
