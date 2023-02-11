const optionInputs = [
  {
    option: 'answer',
    label: 'Answer',
    default: '',
    description: 'The answer to the question.',
    placeholder: ''
  }
]

const type = 'text'

const getChallenge = async (subplebbitChallengeSettings, challengeRequestMessage, challengeAnswerMessage, challengeIndex) => {
  let answer = subplebbitChallengeSettings?.options?.answer
  if (!answer) {
    throw Error('no option answer')
  }

  // use the answer preincluded in the challenge request when possible
  const challengeAnswer = challengeRequestMessage?.challengeAnswers?.[challengeIndex] || challengeAnswerMessage?.challengeAnswers?.[challengeIndex]

  if (challengeAnswer !== answer) {
    return {
      success: false,
      error: 'Wrong answer.'
    }
  }

  return {
    success: true
  }
}

function ChallengeFileFactory (subplebbitChallengeSettings) {
  // some challenges can prepublish the challenge so that it can be preanswered
  // in the challengeRequestMessage
  const question = subplebbitChallengeSettings?.options?.question
  const challenge = question

  return {getChallenge, optionInputs, type, challenge}
}

module.exports = ChallengeFileFactory
