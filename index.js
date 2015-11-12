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
  - document public and private functions
*/

function factory ($, window, document) {
  var fields = []

  // Testing
  // window.__fields = fields

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
    parentSelector: 'p',
    timeout: 1000, // if `false`, no "live" validation
    onSubmit: null,
    validateOnBlur: true,
    validators: {}
  }

  function set (form, fields, settings) {
    $(form)
      .find('input, select, textarea')
      .each(createField)

    function createField (index, el) {
      // Skip input of type `submit`
      if (/submit/.test(el.type)) {
        return
      }

      var $el = $(el)
      var $els, $parent, $error

      if (el.type === 'radio' || el.type === 'checkbox') {
        $els = $el.closest(form).find('[name="' + el.name + '"]')
      } else {
        $els = $el
      }

      if ($els.length > 1) {
        $parent = $el.closest(settings.parentSelector)
        $error = $el.closest(settings.parentSelector).find('.error')
      } else {
        $parent = $el.parent().not(form)
        $error = $el.next('.error')
      }

      var field = {
        el: el,
        name: el.name,
        $els: $els, // intended for groups
        $parent: $parent,
        $error: $error,
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
    var $form = $(form)

    $form
      .on('submit', function onSubmit (event) {
        var firstErrorIndex = validateAll(fields)

        if (firstErrorIndex !== null) {
          event.preventDefault()
          fields[firstErrorIndex].el.focus()
          $form.triggerHandler('validity.invalid', { fields: fields.slice(0) })
        } else if (typeof settings.onSubmit === 'function') {
          event.preventDefault()
          settings.onSubmit(event, form)
        }
      })
      .on('click', '[type="radio"], [type="checkbox"]', onInput)
      .on('input', onInput)

    fields.forEach(function (field) {
      $(field.el).on('blur', onBlur)
    })

    function onInput (event) {
      var el = event.target

      if (el.__validity && settings.timeout !== false) {
        handleDelayed(el.__validity)
      }
    }

    function onBlur (event) {
      var el = event.target

      if (settings.validateOnBlur !== false && el.__validity) {
        handle(el.__validity)
      }
    }
  }
}

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
  var value = getValue(field)
  var message = validate(field, value)
  var isValid = message === null

  field.isValid = isValid
  updateElements(field, message)

  return isValid
}

function getValue (field) {
  var el = field.el
  var type = el.type
  var checked

  if (field.$els.length > 1 || type === 'radio' || type === 'checkbox') {
    checked = field.$els.filter(function (index, el) {
      return el.checked
    })
    return checked.length ? el.value : ''
  }
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

function updateElements (field, message) {
  var action = field.isValid ? 'removeClass' : 'addClass'

  field.$parent[action]('error')
  field.$error.text(message || '')
}

function validate (field, value) {
  var validators = field.validators
  var result = null

  if (validators && validators.length) {
    validators.some(function (fn) {
      result = fn(value, field.name)
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
