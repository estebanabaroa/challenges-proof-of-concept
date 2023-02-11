/* challenge example:

{
  challenge: 'iVBORw0KGgoAAAANSUhE...',
  answer: '48B177D263',
  type: 'image'
}

*/

const {createCaptcha} = require('captcha-canvas')

const optionInputs = [
  {
    option: 'characters',
    label: 'Characters',
    description: 'Amount of characters of the captcha.',
  },
  {
    option: 'height',
    label: 'Height',
    description: 'Height of the captcha.',
  },
  {
    option: 'width',
    label: 'Width',
    description: 'Width of the captcha.',
  },
  {
    option: 'color',
    label: 'Color',
    description: 'Color of the captcha.',
  },
]

const type = 'image'

const getChallenge = async (subplebbitChallengeSettings, challengeRequestMessage, challengeAnswerMessage, challengeIndex) => {
  // setCaptchaOptions https://captcha-canvas.js.org/global.html#SetCaptchaOptions
  const setCaptchaOptions = {}

  let {width, height, characters, color} = subplebbitChallengeSettings?.options || {}
  if (width) {
    width = Number(width)
  }
  if (height) {
    height = Number(height)
  }
  if (characters) {
    setCaptchaOptions.characters = Number(characters)
  }
  if (color) {
    setCaptchaOptions.color = color
  }

  const res = await createCaptcha(width, height, {captcha: setCaptchaOptions})
  const answer = res.text
  const challenge = (await res.image).toString('base64').substring(0, 50) + '...' // trim for demo
  return {challenge, answer, type}
}

function SubplebbitChallengeFileFactory (subplebbitChallengeSettings) {
  return {getChallenge, optionInputs, type}
}

module.exports = SubplebbitChallengeFileFactory
