// the purpose of this challenge is to always fail, can be used with SubplebbitChallenge.exclude to whitelist users

const optionInputs = [
  {
    option: 'error',
    label: 'Error',
    default: `You're not allowed to publish.`,
    description: 'The error to display to the author.',
    placeholder: `You're not allowed to publish.`
  }
]

const type = 'text'

const getChallenge = async (subplebbitChallengeSettings, challengeRequestMessage, challengeAnswerMessage, challengeIndex) => {
  // add a custom error message to display to the author
  const error = subplebbitChallengeSettings?.options?.error

  // the only way to succeed the 'fail' challenge is to be excluded
  return { 
    success: false,
    error: error || `You're not allowed to publish.`
  }
}

function SubplebbitChallengeFileFactory (subplebbitChallengeSettings) {
  return {getChallenge, optionInputs, type}
}

module.exports = SubplebbitChallengeFileFactory
