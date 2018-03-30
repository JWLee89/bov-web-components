/**
 * @Author Jay Lee
 * A Simple accordion component.
 * Animation features are added using CSS.
 * */
(function() {

    /**
     * Utilities
     * ==================
     * */
    var isRealObject = function (input) {
        return Object.prototype.toString.call(input) === "[object Object]";
    };

    var isArray = Array.isArray || function(input) {
        return Object.prototype.toString.call(input) === "[object Array]";
    };

    var isInteger = function(input) {
        return typeof input === "number" && Math.floor(input) === input;
    };

    var booleanToNumber = function(bool) {
        return Number(bool);
    };

    // TODO: Populate default options later
    var defaultOptions = {
        multiSelect: false,   // Allow multiple accordions to be opened simultaneously.
        debug: false          // Shows debug messages when data changes
    };
    var ACCORDION_TEMPLATE; // DOM template for each item inserted

    // common CSS selectors
    var ACCORDION_CLASS_PREFIX = "ReactiveAccordion";
    var ACTIVE_CLASS = ACCORDION_CLASS_PREFIX + "-active";
    var CLASS_SELECTOR = "." + ACCORDION_CLASS_PREFIX;
    var TITLE_CLASS_SELECTOR = CLASS_SELECTOR + "-title";
    var CONTAINER_CLASS_SELECTOR = CLASS_SELECTOR + "-container";
    var CONTENT_CLASS_SELECTOR = CLASS_SELECTOR + "-content";
    var ICON_CLASS_SELECTOR = CLASS_SELECTOR + "-toggle-icon";

    // Generate Accordion template
    (function() {
        function initAccordionTemplate() {
            var docFrag = document.createDocumentFragment();
            // Initialize title
            var titleContainer = document.createElement("div");
            titleContainer.setAttribute("class", ACCORDION_CLASS_PREFIX + "-title");

            var icon = document.createElement("span");
            icon.setAttribute("class", ACCORDION_CLASS_PREFIX + "-toggle-icon");

            var title = document.createElement("h3");
            // Set dummy text
            title.appendChild(document.createTextNode("test"));
            titleContainer.appendChild(icon);
            titleContainer.appendChild(title);
            // Initialize container
            var contents = document.createElement("div");
            contents.setAttribute("class", ACCORDION_CLASS_PREFIX + "-content");
            // Hide initially
            contents.setAttribute("style", "opacity: 0; height: 0; overflow: hidden;");

            // Lastly accordion container
            var container = document.createElement("div");
            container.setAttribute("class", ACCORDION_CLASS_PREFIX + "-container");

            // Append it all together Rawrr!
            container.appendChild(titleContainer);
            container.appendChild(contents);

            // Append container to docFrag
            docFrag.appendChild(container);

            // Set the template
            ACCORDION_TEMPLATE = docFrag;
        }
        initAccordionTemplate();
    })();

    /**
     * @param {Array} data
     * @param {Object} options The options passed to accordion
     * */
    function ReactiveAccordion(data, options) {
        if (!(this instanceof ReactiveAccordion)) {
            return new ReactiveAccordion(data, options);
        }
        this.data = data || [];
        this.options = options || defaultOptions;
        this.root = document.querySelector(this.options.el);
        this.DOMCache = [];
        // Perform validation before initializing
        validateUserInputs.call(this);
        initReactiveAccordion.call(this);
    }

    /**
     * Initialization logic
     * =============================
     * */

    /**
     * Validation check for the bare minimum data for this application to run.
     * */
    function validateUserInputs() {
        if (!this.root) {
            throw new Error("Element with selector " + this.options.el + " is not defined");
        }
        if (!isArray(this.data)) {
            throw new Error(this.data, " is not an array. Must pass in an array.");
        }
        if (!isRealObject(this.options)) {
            throw new Error("Options must be of type Object. ", this.options, " is not an object");
        }
    }

    /**
     * Initialize options. Place in default values
     * if no specific value is defined by users.
     * */
    function initOptions() {
        var key, options = this.options;
        for (key in defaultOptions) {
            if (!(key in options)) {
                options[key] = defaultOptions[key];
            }
        }
    }

    /**
     * Initialize the component
     * */
    function initReactiveAccordion() {
        var that = this;
        initOptions.call(this);
        this.events = {};
        // initialize toggle function
        this.events.toggleAccordion =
                        // Simply toggle
                        function toggleAccordion(evt) {
                            var currentIndex = this.index;
                            // Hide other accordions if multi select is disabled
                            if (!that.options.multiSelect) {
                                var dataList = that.data;
                                that.data.forEach(function(d) {
                                    d.index === currentIndex ?
                                        d.isHidden = !d.isHidden :  // Toggle
                                        d.isHidden = true;          // hide all others
                                 });
                            }
                            // Apply callback if defined
                            if ("toggleAccordion" in that.options) {
                                that.options.toggleAccordion(this);
                            }
                        };
        // initialize the Accordion DOM
        initDOM.call(this);
    }

    /**
     * Initialize the virtual DOM
     * */
    function initDOM() {
        var data = this.data, key, docFrag = document.createDocumentFragment();
        // Give users options to use HTML if needed
        this.titleElement = ACCORDION_TEMPLATE.querySelector(TITLE_CLASS_SELECTOR + " > h3");
        this.contentElement = ACCORDION_TEMPLATE.querySelector(CONTENT_CLASS_SELECTOR);
        for (var index = 0; index < data.length; index++) {
            data[index].isHidden = true;
            createAccordionItem.call(this, data[index], docFrag, index);
        }
        // Lastly, append to the actual DOM only once!
        this.root.appendChild(docFrag);
    }


    /**
     * Private API
     * =============================
     * */

    /**
     * @param {Object} item An accordian data item
     * @param docFrag The target document fragment to append to
     * */
    function createAccordionItem(item, docFrag, index) {
        var icon = item.icon ? item.icon[booleanToNumber(item.isHidden)] : null;
        var title = item.title;
        var content = item.content;
        var useHtml = item.useHtml === true;

        if (useHtml) {
            this.contentElement.innerHTML = content;
        } else {
            // Remove children
            removeChildren(this.contentElement);
            // Update actual DOM, not the copy
            this.contentElement.appendChild(document.createTextNode(content));
        }
        this.titleElement.innerHTML = title;
        var accordionNode = ACCORDION_TEMPLATE.cloneNode(true);

        // Add icon if provided by user
        if (icon) {
            accordionNode.querySelector(ICON_CLASS_SELECTOR).innerHTML = icon;
        }

        // Add references to virtual DOM for fast access
        // and event listeners
        cacheAndInitializeElements.call(
                        this, accordionNode.querySelector(TITLE_CLASS_SELECTOR),
                        accordionNode.querySelector(CONTENT_CLASS_SELECTOR), index);
        // Observe data
        createObservableDataSet.call(this, item, index);
        // return a "deep" duplicate of the node
        docFrag.appendChild(accordionNode);
    }

    /**
     * A very simple, literal virtual DOM
     * I.E. Store the literal node in memory for faster updates.
     * Will update to a slimmer version in the future.
     * */
    function cacheAndInitializeElements(titleElement, contentElement, index) {
        var that = this;
        var cacheObject = {title: titleElement, content: contentElement};
        var cache = that.DOMCache;
        if (index === 0) {
            cache.unshift(cacheObject);
        } else if (index < cache.length) {
            cache.splice(index, 0, cacheObject);
        } else {
            index = that.DOMCache.length;
            cache.push(cacheObject);
        }
        titleElement.addEventListener('click', this.events.toggleAccordion.bind(that.data[index]));
    }

    /**
     * Update the cache indexes after a transaction is made.
     * I am assuming that accordion elements will not be added/removed on a regular basis
     * */
    function updateCacheIndexes() {
        var data = this.data;
        for (var i = 0; i < data.length; i++) {
            data[i].index = i;
        }
    }

    /**
     * @param {HtmlElement} Remove all children
     * */
    function removeChildren(el) {
        while (el.firstChild) {
            // Remove the actual/in-memory DOM element
            el.removeChild(el.firstChild);
        }
    }

    /**
     * @param newNode
     * @param referenceNode
     * */
    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }


    /**
     * Helpers
     * ==============================
     * */

    /**
     * Update the get and set property of data
     * Ensures that data when set, propagattes to the DOM accorindgly
     * @param {Object} data a plain old JavaScript object containing the dataset to observe.
     * @param {Integer} index The index of the current data set
     * */
    function createObservableDataSet(data, index) {
        var that = this;
        data.index = index;
        Object.keys(data).forEach(function(key) {
            var value = data[key];
            reactifyData.call(that, data, key, value);
        });
    }

    /**
     * Print debug message if debug is set to true
     * @param {String} key
     * @param oldValue The value of property prior to change
     * @param newValue The new value of property
     * @param {Object} data The object that was mutated.
     * */
    function printDebugLog(key, oldValue, newValue, data) {
        if (this.options.debug) {
            console.warn(key, " has been updated from: " + oldValue + " to " + newValue, "for data set: ", data);
        }
    }

    function hideAccordion(cachedDomElement) {
        cachedDomElement.content.style.height = "0";
        cachedDomElement.content.style.opacity = 0;
        cachedDomElement.content.classList.remove(ACTIVE_CLASS);
        cachedDomElement.title.classList.remove(ACTIVE_CLASS + "-title");
    }

    function showAccordion(cachedDomElement) {
        cachedDomElement.content.style.height = "auto";
        cachedDomElement.content.style.opacity = 1;
        cachedDomElement.content.classList.add(ACTIVE_CLASS);
        cachedDomElement.title.classList.add(ACTIVE_CLASS + "-title");
    }

    /**
     * Create reactive data components.
     * Right now, we will only worry about data on the primitive level
     * @param {Object} the target object
     * @param {String} key
     * @param value the Value. For now, we will only worry about primitives.
     * */
    function reactifyData(obj, key, value) {
        var that = this;
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function() {
                return value;
            },
            set: function(newValue) {
                var index = obj.index;
                // print debug if configured
                printDebugLog.call(that, key, value, newValue, obj);
                // Set new value after callback is triggered
                value = newValue;
                if (key !== "index") {
                    var title = that.DOMCache[index].title;
                    // toggle
                    if (key === "isHidden") {
                        var cachedAccordionContainer = that.DOMCache[index];
                        var icon = title.firstElementChild;

                        // Set icon if needed
                        if (obj.icon) {
                            icon.innerHTML = obj.icon[booleanToNumber(obj.isHidden)];
                        }

                        // Is hidden
                        if (newValue) {
                            hideAccordion(cachedAccordionContainer);
                        } else {
                            showAccordion(cachedAccordionContainer);
                        }

                    } else if (key === "icon") {
                        title.innerHTML = newValue[booleanToNumber(obj.isHidden)] + title.innerHTML;
                    } else {
                        // DOM update
                        var cachedEl = that.DOMCache[index][key];
                        // Update the DOM
                        if (that.data[index].useHtml) {
                            if (key === "title") {
                                cachedEl.firstElementChild.nextElementSibling.innerHTML = newValue;
                            } else {
                                cachedEl.innerHTML = newValue;
                            }
                        } else {
                            if (key === "title") {
                                var el = cachedEl.firstElementChild.nextElementSibling;
                                removeChildren(el);
                                el.appendChild(document.createTextNode(newValue));
                            } else {
                                removeChildren(cachedEl);
                                cachedEl.appendChild(document.createTextNode(newValue));
                            }
                        }
                    }
                }
            }
        });
    }


    /**
     * Public API
     * ===========================
     * */

    /**
     * @param {Object} data The data to be added
     * @param {Number} index an integer representing the position of the item to be added.
     * If a negative number is provided, the data will be added to the start of the list.
     * If empty, the item is added at the end.
     * */
    ReactiveAccordion.prototype.add = function add(data, index) {
        var docFrag = document.createDocumentFragment();
        if (isInteger(index) && index < this.data.length) {
            index <= 0 ? this.data.unshift(data) :  this.data.splice(index, 0, data);
        } else {
            index = this.data.length;
            this.data.push(data);
        }

        // Set index and hide item
        data.index = index;
        data.isHidden = true;

        // Create element virtually
        createAccordionItem.call(this, data, docFrag, index);

        // Update cache
        updateCacheIndexes.call(this);
        var cachedItem = this.DOMCache[index - 1];

        // Append to DOM at the right place
        cachedItem ? insertAfter(docFrag, cachedItem.title.parentElement)
              : this.root.insertBefore(docFrag, this.root.firstChild);

        return this;
    }

    /**
     * @param {Number} index The index of the accordion to remove
     * @return {ReactiveAccordion}
     * */
    ReactiveAccordion.prototype.remove = function remove(index) {
        if (isInteger(index) && this.data.length > index) {
            // Remove data
            this.data.splice(index, 1);
            // Remove from cache
            var cachedElements = this.DOMCache.splice(index, 1)[0];

            // Update indexes
            updateCacheIndexes.call(this);

            // Remove event listeners
            var titleEl = cachedElements.title;
            titleEl.removeEventListener('click', this.events.toggleAccordion);
            // update DOM
            this.root.removeChild(titleEl.parentElement);
        } else {
            throw new Error(index, " is not a valid index!");
        }
        return this;
    };

    // Expose
    if (!window.ReactiveAccordion) {
        window.ReactiveAccordion = ReactiveAccordion;
    } else {
        throw new Error("ReactiveAccordion is already defined");
    }

})();
