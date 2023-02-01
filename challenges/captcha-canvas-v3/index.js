/* challenge example:

{
  challenge: 'iVBORw0KGgoAAAANSUhE...',
  answer: '48B177D263',
  type: 'image'
}

*/

const {createCaptcha} = require('captcha-canvas')

// setCaptchaOptions https://captcha-canvas.js.org/global.html#SetCaptchaOptions
const getChallenge = async ({width, height, ...setCaptchaOptions} = {}) => {
  if (width) {
    width = Number(width)
  }
  if (height) {
    height = Number(height)
  }
  if (setCaptchaOptions.characters) {
    setCaptchaOptions.characters = Number(setCaptchaOptions.characters)
  }
  const res = await createCaptcha(width, height, {captcha: setCaptchaOptions})
  const answer = res.text
  const challenge = (await res.image).toString('base64').substring(0, 50) + '...' // trim for demo
  return {challenge, answer, type: 'image'}
}

module.exports = {getChallenge}
