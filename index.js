/* global define */

(function (factory) {
  if (typeof exports === 'object') {
    factory.default = factory
    module.exports = factory
  } else if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory)
  } else {
    factory(window.jQuery)
  }
})(function ($) {
  $.fn.validity = function (options) {
    var settings = $.extend({}, $.fn.validity.defaults, options)

    if (!settings.validators.required) {
      settings.validators.required = required(settings.requiredMessage)
    }

    return this
      .filter(function (index, el) {
        return el.nodeName.toUpperCase() === 'FORM'
      }).each(function (index, form) {
        set(form, settings)
        listen(form, settings)
      })
  }

  $.fn.validity.defaults = {
    attributeName: 'data-validators',
    requiredMessage: 'This field is required',
    parentSelector: 'p',
    errorClass: 'error',
    timeout: 1000, // if `false`, no "live" validation
    onSubmit: null,
    validateOnBlur: true,
    validators: {}
  }

  /**
   * Create a `field` object for every input, select or textarea
   * element in the form and attach it to itself.
   */
  function set (form, settings) {
    var fields = form.__validity = []

    $(form)
      .find('input, select, textarea')
      .each(createField)

    function createField (index, el) {
      if (/submit/.test(el.type) || /hidden/.test(el.type)) {
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

  /**
   * Listen to user input and validate the form accordingly.
   */
  function listen (form, settings) {
    var handleDelayed = debounce(function (field) {
      handle(field, settings)
    }, settings.timeout)
    var fields = form.__validity
    var $form = $(form)

    $form
      .on('submit', function onSubmit (event) {
        var firstErrorIndex = validateAll(fields, settings)

        if (firstErrorIndex !== null) {
          event.preventDefault()
          fields[firstErrorIndex].el.focus()
          $form.trigger('validity.invalid', { fields: fields.slice(0) })
        } else if (typeof settings.onSubmit === 'function') {
          event.preventDefault()
          settings.onSubmit(event, form)
        }
      })
      .on('change', 'select, [type="radio"], [type="checkbox"], [type="file"]', onInput)
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
        handle(el.__validity, settings)
      }
    }
  }

  /**
   * Validate the entire form by calling `handle`
   * on every field.
   */
  function validateAll (fields, settings) {
    var index, isValid
    fields.forEach(function (field) { handle(field, settings) })

    isValid = !fields.some(function (field, i) {
      index = i
      return !field.isValid
    })

    return isValid ? null : index
  }

  /**
   * Validate a single field. This sets the `isValid` property on the field
   * object and calls `updateElements`.
   */
  function handle (field, settings) {
    var value = getValue(field)
    var message = validate(field, value)
    var isValid = message === null
    var action = isValid ? 'removeClass' : 'addClass'

    field.isValid = isValid
    field.$parent[action](settings.errorClass)
    field.$error.text(message || '')

    return isValid
  }

  /**
   * Extract the value of a field, normally the input.value.
   * For radio or checkbox input groups, it will return an empty string
   * when no input is checked.
   */
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

  /**
   * Define the validator functions to be used in a field.
   * This is used by `createField`
   */
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

  /**
   * Validate a single field by running all of its validator functions
   * agaist the field’s value.
   */
  function validate (field, value) {
    var validators = field.validators
    var result = null

    if (validators && validators.length) {
      validators.some(function (fn) {
        result = fn(value, field.name, field.el)
        if (result !== null) {
          return true
        }
      })
    }

    return result
  }

  /**
   * The default `required` validator implementation.
   */
  function required (message) {
    return function (value, name) {
      if (!value || value === '') {
        return message
      }
      return null
    }
  }

  /**
   * Debounce utility.
   * @author Remy Sharp
   */
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
  }
})
