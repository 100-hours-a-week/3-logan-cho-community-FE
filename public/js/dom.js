// DOM utility helpers

const dom = {
  // Query selectors
  qs(selector, parent = document) {
    return parent.querySelector(selector)
  },

  qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector))
  },

  // Element creation
  create(tag, attributes = {}, children = []) {
    const element = document.createElement(tag)

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value
      } else if (key === "dataset") {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue
        })
      } else if (key.startsWith("on")) {
        const event = key.substring(2).toLowerCase()
        element.addEventListener(event, value)
      } else {
        element.setAttribute(key, value)
      }
    })

    children.forEach((child) => {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child))
      } else if (child instanceof Node) {
        element.appendChild(child)
      }
    })

    return element
  },

  // Class utilities
  addClass(element, ...classes) {
    element.classList.add(...classes)
  },

  removeClass(element, ...classes) {
    element.classList.remove(...classes)
  },

  toggleClass(element, className) {
    element.classList.toggle(className)
  },

  // Show/hide utilities
  show(element) {
    element.style.display = ""
  },

  hide(element) {
    element.style.display = "none"
  },

  // Toast notification
  showToast(message, type = "info") {
    const toast = this.create(
      "div",
      {
        className: `toast toast-${type}`,
        style: `
        position: fixed;
        bottom: calc(24px + var(--safe-area-inset-bottom));
        left: 50%;
        transform: translateX(-50%);
        background: ${type === "error" ? "var(--color-error)" : "var(--color-primary)"};
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        animation: slideUp 0.3s ease;
      `,
      },
      [message],
    )

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.style.animation = "slideDown 0.3s ease"
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  },

  // Loading spinner
  showSpinner(parent = document.body) {
    const spinner = this.create(
      "div",
      {
        className: "spinner-overlay",
        style: `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `,
      },
      [
        this.create("div", {
          className: "spinner",
          style: `
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        `,
        }),
      ],
    )

    parent.appendChild(spinner)
    return spinner
  },

  hideSpinner(spinner) {
    if (spinner && spinner.parentNode) {
      spinner.remove()
    }
  },
}

// Add CSS animations
const style = document.createElement("style")
style.textContent = `
  @keyframes slideUp {
    from { transform: translate(-50%, 100px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes slideDown {
    from { transform: translate(-50%, 0); opacity: 1; }
    to { transform: translate(-50%, 100px); opacity: 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`
document.head.appendChild(style)

export { dom }
