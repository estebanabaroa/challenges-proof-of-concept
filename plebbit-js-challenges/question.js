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

const description = `Ask a question, like 'What is the password?'`

const getChallenge = async (subplebbitChallengeSettings, challengeRequestMessage, challengeAnswerMessage, challengeIndex) => {
  let answer = subplebbitChallengeSettings?.options?.answer
  if (!answer) {
    throw Error('no option answer')
  }

  // use the answer preincluded in the challenge request when possible
  const challengeAnswer = challengeRequestMessage?.challengeAnswers?.[challengeIndex] || challengeAnswerMessage?.challengeAnswers?.[challengeIndex]

  // the author didn't preinclude his answer, so send him a pubsub challenge message
  if (challengeAnswer === undefined) {
    return {
      challenge: subplebbitChallengeSettings?.options?.question,
      verify: async (_answer) => {
        if (_answer === answer) return {
          success: true
        }
        return {
          success: false,
          error: 'Wrong answer.'
        }
      },
      type
    }
  }

  // the author did preinclude his answer, but it's wrong, so send him a failed challenge verification
  if (challengeAnswer !== answer) {
    return {
      success: false,
      error: 'Wrong answer.'
    }
  }

  // the author did preinclude his answer, and it's correct, so send him a success challenge verification
  return {
    success: true
  }
}

function ChallengeFileFactory (subplebbitChallengeSettings) {
  // some challenges can prepublish the challenge so that it can be preanswered
  // in the challengeRequestMessage
  const question = subplebbitChallengeSettings?.options?.question
  const challenge = question

  return {getChallenge, optionInputs, type, challenge, description}
}

module.exports = ChallengeFileFactory
