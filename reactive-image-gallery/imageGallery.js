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

    var deepCopy = function(obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    var isTextNode = function(node) {
        return node.nodeType === 3;
    }

    /**
     * Quick implementation of simple virtual DOM
     * Implementation based off of @deathmood from article
     * Some parts have been updated to fit my specific needs
     * @credit deathmood
     * @see https://medium.com/@deathmood/write-your-virtual-dom-2-props-events-a957608f5c76
     * ==========================================
     * */
    var VDom = (function() {

        function VDom() {
            if (!(this instanceof VDom)) {
                return new VDom();
            }
        }

        /**
         * Set all the properties from an object
         * onto an element
         *
         * */
        function setProps(el, props) {
            Object.keys(props).forEach(function(property) {
                setProp(el, property, props[property]);
            });
        }

        /**
         * Set a boolean property of a DOM element
         * @param {HtmlElement} el
         * @param {String} property The html attribute / property
         * @param value The value assigned to the property
         * */
        function setBooleanProp(el, property, value) {
            if (value) {
                el.setAttribute(property, value);
                el[property] = true;
            } else {
                el[property] = false;
            }
        }

        function removeBooleanProp(el, property) {
            el.removeAttribute(property);
            el[property] = false;
        }

        function isEventProp(property) {
            return /^on/.test(property);
        }

        function extractEventName(name) {
            return name.slice(2).toLowerCase();
        }

        function isCustomProp(name) {
            return isEventProp(name) || name === 'forceUpdate';
        }

        function addEventListeners(el, props) {
            Object.keys(props).forEach(function(property) {
                if (isEventProp(property)) {
                    el.addEventListener(
                        extractEventName(property),
                        props[property]
                    );
                }
            });
        }

        function removeProp(el, property, value) {
            if (isCustomProp(property)) {
                return;
            } else if (property === "className") {
                el.removeAttribute("class");
            } else if (typeof value === "boolean") {
                removeBooleanProp(el, property);
            } else {
                el.removeAttribute(property);
            }
        }

        function setProp(el, property, value) {
            if (isCustomProp(property)) {
                return;
            } else if (property === "className") {
                el.setAttribute("class", value);
            } else if (typeof value === "boolean") {
                setBooleanProp(el, property, value);
            } else {
                el.setAttribute(property, value);
            }
        }

        /**
         * Used to update propety
         * */
        function updateProp(el, property, newVal, oldVal) {
            if (!newVal) {
                removeProp(el, property, oldVal);
            } else if (!oldVal || newVal !== oldVal) {
                setProp(el, property, oldVal);
                // setProp(el, property, newVal);
            }
        }

        /**
         * Update all properties
         * */
        function updateProps(el, newProps, oldProps) {
            oldProps = oldProps || {};
            var props = Object.assign({}, newProps, oldProps);
            Object.keys(props).forEach(function(property) {
                updateProp(el, property, newProps[property], oldProps[property]);
            });
        }

        function changed(node1, node2) {
            return typeof node1 !== typeof node2 ||
                typeof node1 === 'string' && node1 !== node2 ||
                node1.type !== node2.type ||
                node1.props && node1.props.forceUpdate;
        }

        /**
         * @param {String} tag The html string value for tag. E.g. "div" => div element
         * @param {Object} config Contains all the properties
         * @param {Array} children an Array of virtual elements
         * */
        VDom.prototype.createVirtualElement = function createVirtualElement(tag, props, children) {
            return {
                tag: tag,
                props: props || {},
                children: children || []
            };
        };

        function createEl(virtualNode) {
            if (typeof virtualNode === "string") {
                return document.createTextNode(virtualNode);
            }
            var el = document.createElement(virtualNode.tag);
            // Set properties like class, style, etc.
            setProps(el, virtualNode.props);
            // Event listeners
            addEventListeners(el, virtualNode.props);
            // For those with string children
            if (!Array.isArray(virtualNode.children)) {
                var children = [virtualNode.children];
                children.map(createEl)
                    .forEach(el.appendChild.bind(el));
            } else {
                virtualNode.children.map(createEl)
                    .forEach(el.appendChild.bind(el));
            }
            return el;
        }

        /**
         * Create real DOM elements from the virtual DOM Tree
         * */
        VDom.prototype.createElement = function createElement(virtualNode) {
            return createEl(virtualNode);
        };

        /**
         * Update the actual dom by coparing nodes inside of a virtual DOM
         * */
        VDom.prototype.updateElement = function updateElement(parentElement, oldNode, newNode, index) {
            index = index || 0;
            // old node doesnt exist. Append new node
            if (!oldNode) {
                parentElement.appendChild(
                    createEl(newNode)
                );
            // Node has been deleted
            } else if (!newNode) {
                parentElement.removeChild(
                    parentElement.children[index]
                );
            // Properties changed
            } else if (changed(newNode, oldNode)) {
                if (isTextNode(parentElement)) {
                    parentElement = parentElement.parentElement;
                }
              // console.log("changing nodes:  Parent Element -- ", parentElement,  createEl(newNode), parentElement.childNodes[index] || oldNode);
                if (parentElement.childNodes[index]) {
                    parentElement.replaceChild(
                        createEl(newNode),
                        parentElement.childNodes[index] || oldNode
                    );
                }
            } else if (newNode.tag) {
                // console.warn("updating properties ----------------- ", newNode.props, oldNode.props);
                updateProps(
                    parentElement.childNodes[index],
                    newNode.props,
                    oldNode.props
                );
                var newLength = newNode.children.length;
                var oldLength = oldNode.children.length;
                for (let i = 0; i < newLength || i < oldLength; i++) {
                    updateElement(
                        parentElement.childNodes[index],
                        typeof newNode.children === "string" ? newNode.children : newNode.children[i],
                        typeof oldNode.children === "string" ? oldNode.children : oldNode.children[i],
                        i
                    );
                }
            }
        };

        /**/

        return VDom;
    })();

    // TODO: Populate default options later
    var defaultOptions = {
        autoPlay: {
            enabled: false,
            timePeriod: 8000           // Every 8 seconds, move to the next item
        },
        galleryContainerClass: "reactive-gallery-container",
        thumbnailContainerClass: "reactive-gallery-thumbnail-container",
        thumbnailImageClass: "reactive-gallery-thumbnail-image",
        imageContainerClass: "reactive-gallery-item-container",
        imageClass: "reactive-gallery-image-container",
        titleClass: "reactive-gallery-item-title",
        captionClass: "reactive-gallery-caption",
        leftArrowClass: "reactive-gallery-arrow arrow-left",
        rightArrowClass: "reactive-gallery-arrow arrow-right",
        // Load all DOM elements during the initialization phase.
        lazyLoad: false,
        thumbnailPosition: "top",   // Placed at the top
        stretchImage: false,        // Don't forcefully stretch image
    };
    // Default css styles
    var HIDDEN_STYLE = "opacity: 0;";
    var DISPLAY_STYLE = "opacity: 1;";
    var STRETCHED_IMAGE_STYLE = "width:100%;height:100%;position: absolute;top:0;left:0;";
    var THUMBNAIL_STYLE = "width:100px;height:100px;cursor:pointer;margin-top:10px;";
    var CAPTION_STYLE = "position: absolute; bottom: 0; width: 100%; text-align:center; font-size: 1.2em;"
    var TITLE_STYLE = "position: absolute; top: 0; width: 100%; text-align:center; font-size: 1.4em;";

    // Fixed classes
    var ACTIVE_CLASS = "active";
    var NO_TRANSITION_CLASS = "no-transition";    // Temporarily disable transition to avoid transitioning on thumbnail that is being hidden

    function ReactiveGallery(config) {
        if (!(this instanceof ReactiveGallery)) {
            return new ReactiveGallery(config);
        }
        // Borrow Virtual DOM
        this.VDom = new VDom();
        this.rootElement = config.rootElement;
        // By default, start off with the first image
        // Otherwise, the index specified by user
        this.currentStatus = { index: config.options.startingIndex || 0 };
        this.options = config.options;
        if (config.data || config.data.length <= 0) {
            this.data = config.data;
        } else {
            throw new Error("data must be provided");
        }
        initOptions.call(this);
        // Create Virtual DOM and append to actual DOM
        initImageGalleryTemplate.call(this);

        // Autoplay feature
        if (this.options.autoPlay.enabled) {
            initAutoPlay.call(this);
        }
    }

    /**
     * Initialize the autoplay feature
     * */
    function initAutoPlay() {
        var that = this;
        var autoPlay = this.options.autoPlay;
        // Start event
        autoPlay.event =
            setTimeout(function () {
                moveForward.call(that);
            }, that.options.autoPlay.timePeriod);
        observeAutoPlayProperty.call(this, autoPlay, "enabled", autoPlay.enabled);
    }

    /**
     * Observe the autoplay enabled boolean flag property
     * */
    function observeAutoPlayProperty(data, key, value) {
        var that = this;
        // Observe data
        Object.defineProperty(data, "enabled", {
            enumerable: true,
            configurable: true,
            get: function() {
                return value;
            },
            set: function(newValue) {
                value = newValue;
                doAutoPlay.call(that);
            }
        });
    }

    /**
     * Trigger autoplay event if configured;
     * */
    function doAutoPlay() {
        // Clear interval for autoplay
        clearTimeout(this.options.autoPlay.event);
        if (this.options.autoPlay.enabled) {
            var that = this;
            this.options.autoPlay.event = setTimeout(function () {
                moveForward.call(that);
            }, that.options.autoPlay.timePeriod);
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
     * @param {Array} the list of objects to observe
     * */
    function observeList(list) {
        var that = this;
        list.forEach(function(item) {
            observeObject.call(that, item);
        });
    }

    /**
     * @param {Object} obj The object to observe
     * */
    function observeObject(obj) {
        var that = this;
        Object.keys(obj).forEach(function(key) {
           observeData.call(that, obj, key, obj[key]);
        });
    }

    /**
     * @param {Object} data The data to observe
     * */
    function observeData(data, key, value) {
        var that = this, cache = that.idCache;
        var index = { caption: 1, title: 2, src: 0 };
        // Selector for cached DOM element
        var selector = {
            title: "." + that.options.titleClass,
            caption: "." + that.options.captionClass,
            src: "." + that.options.imageClass
        };

        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,
            get: function() {
                return value;
            },
            set: function(newValue) {
                console.warn("updating data: ", data, ". Old value: ", value, ". New value: ", newValue, "Key: ", key);
                // 1. find Virtual DOM element and DOM reference from cache.
                var cachedInfo = cache[data.cacheIndex];
                var newChild = cachedInfo.virtualEl;

                // 2. Update the DOM
                if (key === "caption" || key === "title") {
                    var oldVirtualRoot = deepCopy(newChild);
                    var newChildNode = newChild.children[index[key]];
                    // Update virtual DOM
                    newChildNode.children = newValue;
                    // Query from cache for quick access
                    var realElement = cachedInfo.el.querySelector(selector[key]);

                    // hide empty contents
                    var trimmedValue = newValue.trim();
                    if (trimmedValue && realElement.style.display === "none") {
                        realElement.style.display = "block";
                    } else if (!trimmedValue) {
                        realElement.style.display = "none";
                    }

                    // Lastly, update DOM by examiming changes in virtual DOM
                    that.VDom.updateElement(realElement, newChildNode, oldVirtualRoot.children[index[key]]);
                } else if (key === "src") {
                    var oldVirtualRoot = deepCopy(newChild);
                    var newChildNode = newChild.children[index[key]];
                    // Update virtual DOM
                    newChildNode.props.src = newValue;
                    // This time, since src is a property, the prop will be updated
                    that.VDom.updateElement(cachedInfo.el.querySelector(selector[key]).parentElement, newChildNode, oldVirtualRoot.children[index[key]]);
                // Transition images
                } else if (key === "isHidden") {
                    // current element must be set to false
                    if (data.isHidden) {
                        showImage(cachedInfo.el);
                    } else {
                        hideImage(cachedInfo.el);
                    }
                    // lastly, update current Index
                    that.currentStatus.index = data.cacheIndex;
                }
                // 3. Lastly, update data
                value = newValue;
            }
        })
    }

    /**
     * Hide target element
     * @param {HtmlElement} element The element to be hidden
     * */
    function hideImage(element) {
        element.style.opacity = 0;
       // element.style.display = "none";
        element.classList.remove(ACTIVE_CLASS);
    }

    /**
     * Show target element
     * @param {HtmlElement} element The element to be displayed
     * */
    function showImage(cachedDomElement) {
        cachedDomElement.style.opacity = 1;
        cachedDomElement.style.display = "block";
        cachedDomElement.classList.add(ACTIVE_CLASS);
    }


    /**
     * Initialize the image gallery template which will continue to be re-used.
     * */
    function initImageGalleryTemplate() {
        var docFrag = document.createDocumentFragment();
        var that = this;
        var dataList = this.data;
        var createElement = this.VDom.createElement;
        // Keeps track of elements and provides quick lookup
        this.idCache = {};

        // Create virtual DOM
        initVirtualDomTree.call(this, dataList);

        // Observe user-defined data
        observeList.call(this, dataList);

        var docFrag = document.createDocumentFragment();

        this.domTreeEl = createElement(this.virtualDomTree);
        this.thumbnailTreeEl = createElement(this.virtualThumbnailTree);

        if (this.options.thumbnailPosition.toLowerCase() === "top") {
            docFrag.appendChild(this.thumbnailTreeEl);
            docFrag.appendChild(this.domTreeEl);
        } else{
            docFrag.appendChild(this.domTreeEl);
            docFrag.appendChild(this.thumbnailTreeEl);
        }

        // Lastly, operate on the actual DOM.
        // If lazy load, only load the current element
        // TODO: Currently not implemented due to not wanting to spend more than three days
        // On this single exercise.
        if (this.options.lazyLoad) {
            this.rootElement.appendChild(docFrag);
        } else {
            this.rootElement.appendChild(docFrag);
        }

        // Cache dom for quicker access
        cacheDOM.call(this);
    }

    /**
     * Update the data object. Because data is being observed,
     * DOM will also be updated automatically.
     * */
    function toggleData(id) {
        var currentStatusIndex = this.currentStatus.index;
        if (currentStatusIndex === id) {
            return;
        }
        this.data[currentStatusIndex].isHidden = true;
        this.data[id].isHidden = false;
        // Toggle thumbnails
        toggleThumbnails.call(this, currentStatusIndex, id);
        // Clear interval for autoplay
        if (this.options.autoPlay.enabled) {
            doAutoPlay.call(this);
        }
    }

    /**
     * Toggle thumbnail DOM
     * */
    function toggleThumbnails(previousActiveIndex, currentActiveIndex) {
        // Toggle thumbnail;
        var cache = this.idCache;
        var cacheKeys = Object.keys(cache);
        // Remove active class from inactive images and enable transition
        var currentElement = cache[currentActiveIndex].thumbnailEl;
        currentElement.classList.remove(NO_TRANSITION_CLASS);
        currentElement.classList.add(ACTIVE_CLASS);

        // Remove transition so that inactivating will not trigger animation
        var previousElement = cache[previousActiveIndex].thumbnailEl;
        previousElement.classList.remove(ACTIVE_CLASS);
        previousElement.classList.add(NO_TRANSITION_CLASS);
    }

    /**
     * Create virtual DOM
     * @param {Array} dataList The data passed in by the user
     * */
    function initVirtualDomTree(dataList) {
        var that = this, idCache = this.idCache;
        var createVirtualEl = this.VDom.createVirtualElement;
        var createEl = this.VDom.createElement;

        var options = that.options;

        // Thumbnail gallery
        var thumbnailGallery = createVirtualEl("div", { className: options.thumbnailContainerClass, style: "position: relative; width: 100%; height: 140px; z-index: 1000; overflow-x: auto; overflow-y:hidden; white-space: nowrap;"});

        var virtualGalleryRoot = createVirtualEl("div", { className: options.galleryContainerClass, style: "position: relative; width: 100%; height: 100%;"},
            dataList.map(function(data, index) {

                var children = [createVirtualEl("img", {
                    className: options.imageClass,
                    src: data.src, alt: data.alt || "",
                    style: that.options.stretchImage ? STRETCHED_IMAGE_STYLE : null
                })];

                var captionStyle = CAPTION_STYLE;
                var titleStyle = TITLE_STYLE;

                if (!("caption" in data)) {
                    data.caption = " ";
                    captionStyle += "display:none;";
                }
                if (!("title" in data)) {
                    data.title = " ";
                    titleStyle += "display:none;";
                }

                // Add caption and title to virtual DOM
                children.push(createVirtualEl("div", { className: options.captionClass, style: captionStyle}, data.caption));
                children.push(createVirtualEl("div", { className: options.titleClass, style: titleStyle}, data.title));

                // slide is hidden if it is not equal to the current index
                var isHidden = !(that.currentStatus.index === index);
                data.isHidden = isHidden;

                // Create the image slide container class
                var virtualElement = createVirtualEl("div", { className: options.imageContainerClass,
                    // Hide all but starting element
                    style: isHidden ? HIDDEN_STYLE : DISPLAY_STYLE },
                    children);

                // Add to cache
                idCache[index] = {
                    virtualEl: virtualElement
                };

                // Append thumbnail object
                thumbnailGallery.children.push(createVirtualEl("img", {className: options.thumbnailImageClass ,src: data.src, alt: data.alt || "", id: "THUMBNAIL_IMG_" +
                    index, style:THUMBNAIL_STYLE, onClick: function(evt) {
                    var currentThumbnail = evt.target;
                    // Toggle image
                    var id = Number(currentThumbnail.id[currentThumbnail.id.length - 1]);
                    toggleData.call(that, id);
                }}));

                // cacheIndex
                data.cacheIndex = index;
                return virtualElement;
            }));
        // append arrows
        appendVirtualArrows.call(this, virtualGalleryRoot);
        // Add container children
       // mainRoot.children.push(thumbnailGallery);
        //mainRoot.children.push(virtualGalleryRoot);
        // Set property
        this.virtualDomTree = virtualGalleryRoot;
        // Set Gallery Tree
        this.virtualThumbnailTree = thumbnailGallery;
    }

    /**
     * Cache actual DOM items for quick access
     * */
    function cacheDOM() {
        var cache = this.idCache;
        var rootElement = this.rootElement;
        var items = rootElement.querySelectorAll("." + this.options.imageContainerClass);
        var thumbnails = rootElement.querySelectorAll("." + this.options.thumbnailImageClass);
        // add Thumbnail El and container El to the cache
        Object.keys(cache).forEach(function(index) {
            cache[index].el = items[index];
            cache[index].thumbnailEl = thumbnails[index];
        });
    }


    /**
     * Append virtual dom arrow elements
     * */
    function appendVirtualArrows(container) {
        var createVirtualEl = this.VDom.createVirtualElement;
        var options = this.options;
        var that = this;
        // Left arrow
        container.children.push(this.VDom.createVirtualElement("div", {
            className: options.leftArrowClass,
        onClick: moveBackward.bind(that) }));
        // Right Arrow
        container.children.push(this.VDom.createVirtualElement("div", {
            className: options.rightArrowClass,
        onClick: moveForward.bind(that) }));
    }

    /**
     * @param {Event} evt the on click JavaScript event object.
     * @this {ReactiveGallery}
     * */
    function moveBackward(evt) {
        var currentIndex = this.currentStatus.index - 1;
        // Go to last element if we are on the last item
        if (currentIndex < 0) {
            currentIndex = this.data.length - 1;
        }
        // Toggle data
        toggleData.call(this, currentIndex);
        // Update index
        this.currentStatus.index = currentIndex;
    }

    /**
     * @param {Event} evt the on click JavaScript event object.
     * @this {ReactiveGallery}
     * */
    function moveForward(evt) {
        var currentIndex = this.currentStatus.index + 1;
        // Go backwards to first element if we are on the last item
        if (currentIndex > this.data.length - 1) {
            currentIndex = 0;
        }
        // Toggle data
        toggleData.call(this, currentIndex);
        // Update index
        this.currentStatus.index = currentIndex;
    }

    /**
     * Public API - None as of yet
     * ========================
     * */

    // Expose
    if (window.RactiveGallery === undefined) {
        window.ReactiveGallery = ReactiveGallery;
    } else {
        throw new Error("ReactiveGallery is already defined in the global window object");
    }
})();
