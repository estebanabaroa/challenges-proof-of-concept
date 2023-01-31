/* challenge example:

{ 
  challenge: '73 - 32', 
  answer: '41',
  type: 'text'
}

*/

const getRandomNumber = (minNumber, maxNumber) => Math.floor(Math.random() * (maxNumber - minNumber + 1) + minNumber)

const getChallengeString = (minNumber, maxNumber, operators) => {
  let firstNumber = getRandomNumber(minNumber, maxNumber)
  let secondNumber = getRandomNumber(minNumber, maxNumber)
  const operator = operators[getRandomNumber(0, operators.length - 1)]
  // reduce multiply difficulty
  if (operator === '*') {
    firstNumber = Math.ceil(firstNumber / 10)
    secondNumber = Math.ceil(secondNumber / 10)
  }
  // don't allow negative numbers
  if (operator === '-' && firstNumber < secondNumber) {
    const _firstNumber = firstNumber
    firstNumber = secondNumber
    secondNumber = _firstNumber
  }
  return `${firstNumber} ${operator} ${secondNumber}`
}

const getChallenge = async ({difficulty} = {}) => {
  if (!difficulty) {
  	difficulty = 1
  }

  let challenge
  if (difficulty === 1) {
    challenge = getChallengeString(1, 10, ['+', '-'])
  }
  else if (difficulty === 2) {
    challenge = getChallengeString(10, 100, ['+', '-', '*'])
  }
  else if (difficulty === 3) {
    challenge = getChallengeString(100, 1000, ['+', '-', '*'])
  }
  else {
    throw Error(`invalid challenge difficulty '${difficulty}'`)
  }

  const answer = String(eval(challenge))
  return {challenge, answer, type: 'text'}
}

module.exports = {getChallenge}
