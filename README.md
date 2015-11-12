# jQuery Validity

A form validation jQuery plugin written in late 2015 (whatever that means).

This is heavily inspired by the [Abide](http://foundation.zurb.com/docs/components/abide.html) library (from the Zurb Foundation framework), but implemented completely from scratch and as a jQuery plugin, npm-ready and most of all not bloated.

## Install

Using `npm`:

```bash
npm install jquery-validity
```

## Usage

```html
<form novalidate>
  <label>Email
    <input type="text" name="email" required data-validators="email">
  </label>
  <label>Username
    <input type="text" name="username" required>
  </label>
  <input type="submit">
</form>
```

```js
require('jquery-validity')
var $ = require('jquery')
// Use any validation logic you like
var validator = require('validator')

$('form').validity({
  onSubmit: function (event, form) {
    // The form is valid, handle submission..
    // `form.submit()`
  },
  validators: {
    email: emailValidator('Please enter a valid email')
  }
})

// A `validator` is a function that receives a `value`
// and should return `null` if valid, or a message if not
function emailValidator (message) {
  return function (value, name) {
    if (validator.isEmail(value)) {
      return null
    }
    return message
  }
}
```

## API

See [API.md](https://github.com/acstll/jquery-validity/blob/master/API.md).

## TODO

- Proper tests
- A better usage guide and examples

## License

MIT
