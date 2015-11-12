/* global jQuery */

(function (factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    factory(require('jquery'), global, global.document)
  } else {
    factory(jQuery, window, document)
  }
}(factory))

/*
  TODO
  - remove `onSubmit` and emit `validity.valid` and `validity.invalid` events
  - handle groups (radio, checkboxes)
  - set click listener for groups
  - pass `name` to validator fns
  - document public/private functions
*/

function factory ($, window, document) {
  var fields = []

  $.fn.validity = function (options) {
    var settings = $.extend({}, $.fn.validity.defaults, options)

    if (!settings.validators.required) {
      settings.validators.required = required(settings.requiredMessage)
    }

    return this.each(function (index, form) {
      set(form, fields, settings)
      listen(form, fields, settings)
    })
  }

  $.fn.validity.defaults = {
    attributeName: 'data-validators',
    requiredMessage: 'This field is required',
    timeout: 1000, // if `false`, no "live" validation
    onSubmit: null,
    validateOnBlur: true,
    validators: {}
  }

  function set (form, fields, settings) {
    $(form)
      .find('input, select, textarea')
      .each(parse)

    function parse (index, el) {
      // Skip input of type `submit`
      if (/submit/.test(el.type)) {
        return
      }

      // TODO handle groups

      var $el = $(el)
      var field = {
        el: el,
        $els: [$el], // intended for groups
        $parent: $el.parent().not(form),
        $error: $el.next('.error'),
        validators: getValidators(el, settings),
        isValid: true
      }

      el.__validity = field
      fields.push(field)
    }
  }

  function listen (form, fields, settings) {
    var handleDelayed = debounce(function (field) {
      handle(field)
    }, settings.timeout)

    $(form)
      .on('click', function onClick (event) {
        // handle only `radio` and `checkbox`
        console.log('click')
      })
      .on('input', function onInput (event) {
        var el = event.target
        if (el.__validity && settings.timeout !== false) {
          handleDelayed(el.__validity)
        }
      })
      .on('submit', function onSubmit (event) {
        var firstErrorIndex = validateAll(fields)

        if (firstErrorIndex !== null) {
          event.preventDefault()
          fields[firstErrorIndex].el.focus()
        } else if (typeof settings.onSubmit === 'function') {
          event.preventDefault()
          settings.onSubmit(event, form)
        }
      })

    fields.forEach(function (field) {
      $(field.el).on('blur', onBlur)
    })

    function onBlur (event) {
      var el = event.target

      if (settings.validateOnBlur !== false && el.__validity) {
        handle(el.__validity)
      }
    }
  }
}

// TODO document
function validateAll (fields) {
  var index, isValid
  fields.forEach(handle)

  isValid = !fields.some(function (field, i) {
    index = i
    return !field.isValid
  })

  return isValid ? null : index
}

function handle (field) {
  var value = getValue(field.el)
  var message = validate(field.validators, value)
  var isValid = message === null

  field.isValid = isValid
  updateElements(field, message)

  return isValid
}

function getValue (el) {
  // TODO handle radios and checkboxes?
  return el.value.trim()
}

function getValidators (el, settings) {
  var data = el.getAttribute(settings.attributeName) || ''
  var keys = data.split(' ')

  if (el.required) {
    keys.unshift('required')
  }

  return keys
    .map(function (key) {
      return settings.validators[key]
    })
    .filter(function (fn) {
      return typeof fn === 'function'
    })
}

// Update element with classes and error messages
function updateElements (field, message) {
  // TODO handle groups
  var action = field.isValid ? 'removeClass' : 'addClass'

  field.$parent[action]('error')
  field.$error.text(message || '')
}

function validate (validators, value) {
  var result = null

  if (validators && validators.length) {
    validators.some(function (fn) {
      result = fn(value) // TODO add `name` as second param
      if (result !== null) {
        return true
      }
    })
  }

  return result
}

// Default validator
function required (message) {
  return function (value, name) {
    if (!value || value === '') {
      return message
    }
    return null
  }
}

function debounce (fn, delay) {
  var timer = null

  if (delay === false) {
    return fn
  }

  return function () {
    var context = this
    var args = arguments
    clearTimeout(timer)
    timer = setTimeout(function () {
      fn.apply(context, args)
    }, delay)
  }
} // Remy Sharp
