import { rewind } from "./rewind.js";

const checkbox = document.createElement("input");
checkbox.type = "checkbox";
const RewindCheckbox = rewind(checkbox, {
  observe: ["checked", "indeterminate"],
});
customElements.define("rw-checkbox", RewindCheckbox);

const select = document.createElement("select");
const RewindSelect = rewind(select, {
  observe: ["value"],
});
customElements.define("rw-select", RewindSelect);

const textbox = document.createElement("input");
textbox.type = "text";
const RewindTextBox = rewind(textbox, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-text-box", RewindTextBox);

const textarea = document.createElement("textarea");
const RewindTextarea = rewind(textarea, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-textarea", RewindTextarea);

const numberbox = document.createElement("input");
numberbox.type = "number";
const RewindNumberBox = rewind(numberbox, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-number-box", RewindNumberBox);

const colorbox = document.createElement("input");
colorbox.type = "color";
const RewindColorBox = rewind(colorbox, {
  observe: ["value"],
});
customElements.define("rw-color-box", RewindColorBox);

const dateBox = document.createElement("input");
dateBox.type = "date";
const RewindDateBox = rewind(dateBox, {
  observe: ["value"],
});
customElements.define("rw-date-box", RewindDateBox);

const dateTimeLocalBox = document.createElement("input");
dateTimeLocalBox.type = "datetime-local";
const RewindDateTimeLocalBox = rewind(dateTimeLocalBox, {
  observe: ["value"],
});
customElements.define("rw-datetime-local-box", RewindDateTimeLocalBox);

const emailBox = document.createElement("input");
emailBox.type = "email";
const RewindEmailBox = rewind(emailBox, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-email-box", RewindEmailBox);

const monthBox = document.createElement("input");
monthBox.type = "month";
const RewindMonthBox = rewind(monthBox, {
  observe: ["value"],
});
customElements.define("rw-month-box", RewindMonthBox);

const timeBox = document.createElement("input");
timeBox.type = "time";
const RewindTimeBox = rewind(timeBox, {
  observe: ["value"],
});
customElements.define("rw-time-box", RewindTimeBox);

const passwordBox = document.createElement("input");
passwordBox.type = "password";
const RewindPasswordBox = rewind(passwordBox, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-password-box", RewindPasswordBox);

const range = document.createElement("input");
range.type = "range";
const RewindRange = rewind(range, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-range", RewindRange);

const searchBox = document.createElement("input");
searchBox.type = "search";
const RewindSearchBox = rewind(searchBox, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-search-box", RewindSearchBox);

const urlBox = document.createElement("input");
urlBox.type = "url";
const RewindUrlBox = rewind(urlBox, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-url-box", RewindUrlBox);

const telBox = document.createElement("input");
telBox.type = "tel";
const RewindTelBox = rewind(telBox, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});
customElements.define("rw-tel-box", RewindTelBox);

const weekBox = document.createElement("input");
weekBox.type = "week";
const RewindWeekBox = rewind(weekBox, {
  observe: ["value"],
});
customElements.define("rw-week-box", RewindWeekBox);

class RadioGroup extends HTMLElement {
  #value = "";
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener("input", this.#handleInput.bind(this));
    this.#init();
  }

  get value() {
    return this.#value;
  }

  set value(newValue) {
    this.#value = newValue;
    this.#update();
  }

  #radios() {
    return this.querySelectorAll('input[type="radio"]');
  }

  #handleInput(event) {
    if (event.target.type === "radio") {
      this.value = event.target.value;
    }
  }

  #init() {
    this.#radios().forEach((radio) => {
      this.#value = radio.checked ? radio.value : this.#value;
    });
  }

  #update() {
    this.#radios().forEach((radio) => {
      radio.checked = radio.value === this.#value;
    });
  }
}
const RewindRadioGroup = rewind(RadioGroup, {
  observe: ["value"],
});
customElements.define("rw-radio-group", RewindRadioGroup);

export {
  RewindCheckbox,
  RewindSelect,
  RewindTextBox,
  RewindNumberBox,
  RewindTextarea,
  RewindColorBox,
  RewindDateBox,
  RewindDateTimeLocalBox,
  RewindMonthBox,
  RewindTimeBox,
  RewindEmailBox,
  RewindPasswordBox,
  RewindRange,
  RewindSearchBox,
  RewindUrlBox,
  RewindTelBox,
  RewindWeekBox,
  RewindRadioGroup,
};
