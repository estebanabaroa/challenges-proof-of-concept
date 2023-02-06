
const getChallengeVerification = async ({answer = ''} = {}, challengeAnswer, publication) => {
  if (!answer) {
    throw Error('no option answer')
  }

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

module.exports = {getChallengeVerification}
