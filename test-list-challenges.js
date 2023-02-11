const path = require('path')
const fs = require('fs')
const {Plebbit, subplebbits} = require('./fixtures')

const getChallengeSettingsDisplayName = (subplebbitChallengeSettings) => {
  if (subplebbitChallengeSettings.name) {
    return 'plebbit-js-' + subplebbitChallengeSettings.name
  }
  if (subplebbitChallengeSettings.path) {
    return path.basename(subplebbitChallengeSettings.path)
  }
}

const listAvailableSubplebbitChallengesSettings = () => {
  const challengesSettings = {}

  // get plebbit-js challenges
  for (const name in Plebbit.challenges) {
    const challengeSettings = {name}
    challengesSettings[getChallengeSettingsDisplayName(challengeSettings)] = challengeSettings
  }

  // get challenges in challenges folder
  const challengesSettingsInChallengesFolder = fs.readdirSync(path.join(__dirname, 'challenges'))
    .map(name => ({path: path.join(__dirname, name)}))
  for (const challengeSettings of challengesSettingsInChallengesFolder) {
    challengesSettings[getChallengeSettingsDisplayName(challengeSettings)] = challengeSettings
  }

  return challengesSettings
}

const listChallengesOfSubplebbit = (subplebbit) => {
  const challenges = []
  for (const subplebbitChallengeSettings of subplebbit.settings.challenges) {
    challenges.push(subplebbitChallengeSettings)
  }
  return challenges
}

// the UI can use this function to list a dropdown selection of available subplebbit challenges
console.log(listAvailableSubplebbitChallengesSettings())

for (const subplebbit of subplebbits) {
  console.log('--', subplebbit.title)
  for (const subplebbitChallengeSettings of subplebbit.settings.challenges) {
    console.log('')
    console.log('----', 'display name:', getChallengeSettingsDisplayName(subplebbitChallengeSettings))
    console.log(subplebbitChallengeSettings)
  }
  console.log('')
}
