
require('../index')
var $ = require('jquery')
var validator = require('validator')

$('form').validity({
  onSubmit: function (event, form) {
    setTimeout(function () {
      form.submit()
    }, 500)
    console.log('submitting..')
  },
  // timeout: false,
  requiredMessage: 'This shit is required',
  validators: {
    email: function (value) {
      if (!validator.isEmail(value)) {
        return 'Please enter a valid email'
      }
      return null
    },
    color: function (value) {
      if (value === '') {
        return null
      }
      if (value === 'groc' || value === 'blau' || value === 'vermell') {
        return null
      }
      return 'Only the three basic colors are allowed'
    }
  }
})
