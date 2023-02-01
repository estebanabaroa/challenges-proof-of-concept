const getChallenge = async () => {
  return { 
    challenge: 'The auto fail challenge can never succeed.', 
    type: 'text',
    success: false,
    error: 'The auto fail challenge can never succeed.'
  }
}

module.exports = {getChallenge}
