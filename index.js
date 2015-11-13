/* global jQuery */

(function (factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    factory(require('jquery'), global, global.document)
  } else {
    factory(jQuery, window, document)
  }
}(factory))

function factory ($, window, document) {
  var fields = []

  // Testing
  // window.__fields = fields

  /**
   * Apply validation to one or more selected form elements.
   *
   * @param {Object} options
   * @param {string} options.attributeName The attribute used on input elements
   * to determine its validator methods
   * @param {string} options.requiredMessage The error message for the default
   * `required` validator
   * @param {string} options.parentSelector The element that groups radio or
   * checkbox type inputs and receives the error class
   * @param {number|false} options.timeout Number of milliseconds it takes for
   * validation to occur after the latest user input (set `false` to disable)
   * @param {function} options.onSubmit A callback that fires on submission of
   * the form when valid
   * @param {boolean} options.validateOnBlur
   * @param {Object} options.validators An object with the validator functions
   * @returns {Object} jQuery element instance
   */
  $.fn.validity = function (options) {
    var settings = $.extend({}, $.fn.validity.defaults, options)

    if (!settings.validators.required) {
      settings.validators.required = required(settings.requiredMessage)
    }

    return this
      .filter(function (index, el) {
        return el.nodeName.toUpperCase() === 'FORM'
      }).each(function (index, form) {
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

  /**
   * Create a `field` object for every input, select or textarea
   * element in the form and attach it to itself.
   *
   * @param {HTMLFormElement} form
   * @param {array} fields An empty array to be filled with `field` objects
   * @param {Object} settings
   * @returns {undefined}
   * @private
   */
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

  /**
   * Listen to user input and validate the form accordingly.
   *
   * @param {HTMLFormElement} form
   * @param {array<field>} fields
   * @param {Object} settings
   * @returns {undefined}
   * @private
   */
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
        handle(el.__validity)
      }
    }
  }
}

/**
 * Validate the entire form by calling {@link handle}
 * on every field.
 *
 * @param {array<field>} fields
 * @returns {number|undefined} `null` if the form is valid, otherwise the index of
 * the first field with an error
 * @private
 */
function validateAll (fields) {
  var index, isValid
  fields.forEach(handle)

  isValid = !fields.some(function (field, i) {
    index = i
    return !field.isValid
  })

  return isValid ? null : index
}

/**
 * Validate a single field. This sets the `isValid` property on the field
 * object and calls {@link updateElements}.
 *
 * @param {field} field
 * @returns {boolean} `true` if valid, `false` is not
 * @private
 */
function handle (field) {
  var value = getValue(field)
  var message = validate(field, value)
  var isValid = message === null

  field.isValid = isValid
  updateElements(field, message)

  return isValid
}

/**
 * Extract the value of a field, normally the input.value.
 * For radio or checkbox input groups, it will return an empty string
 * when no input is checked.
 *
 * @param {field} field
 * @returns {string}
 * @private
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
 * This is used by {@link createField}
 *
 * @param {HTMLElement} el
 * @param {Object} settings
 * @returns {array<Function>} An array of validator functions
 * @private
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
 * Update the DOM of a field according to validity.
 *
 * @param {field} field
 * @param {string} message The error message
 * @returns {undefined}
 * @private
 */
function updateElements (field, message) {
  var action = field.isValid ? 'removeClass' : 'addClass'

  field.$parent[action]('error')
  field.$error.text(message || '')
}

/**
 * Validate a single field by running all of its validator functions
 * agaist the field’s value.
 *
 * @param {field} field
 * @param {string} value
 * @returns {undefined|string} `null` if valid, a string with error message otherwise
 * @private
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
 *
 * @param {string} message
 * @returns {Function}
 * @private
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
 *
 * @param {Function} fn
 * @param {number|false} delay
 * @returns {Function}
 * @author Remy Sharp
 * @private
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
