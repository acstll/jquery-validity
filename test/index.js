
require('../index')
var $ = require('jquery')
var validator = require('validator')

window.$ = $

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
    },
    images: function (value, name, el) {
      var files = el.files
      var re = /png|jpg|jpeg|gif/
      var type

      if (!files.length) {
        return null
      }
      type = files[0].type
      if (!re.test(type)) {
        return 'No files other than images, please'
      }
      return null
    }
  }
})
.on('validity.invalid', function (event, fields) {
  console.log('Invalid', fields)
})
