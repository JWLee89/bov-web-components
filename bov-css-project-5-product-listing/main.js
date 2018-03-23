/**
 * Begin Shopping List Manager
 * ===============================
 * A simple and extremely hard-coded API for
 * managing shopping lists and the DOM.
 *
 * A very quick and rough implementation to
 * replicate an APi for creating reactive components.
 *
 * Inspired by Vue.js and handlebars.
 *
 * Note: writing with Vue.js will result in cleaner, shorter code
 * but I wanted to try building a hard-coded reactive library
 * for fun.
 *
 * */
(function() {
    /**
     * Utility functions
     * =======================
     * */
    /**
     * Deep copy nested objects inside of array
     * @param {Array} arr the array to deep copy
     * */
    function deepCopy(arr) {
        return JSON.parse(JSON.stringify(arr));
    }

    /**
     * Note: We can also use binary search if the list is sorted
     * But for now, we will implement a linear search
     *
     * @param {Array} list the list of items we are looking for
     * @param {Number} id of the item we are looking for
     * @return {Number} index of item. If does not exist, return -1
     * */
    function indexOfItem(list, id) {
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Add event listener by function reference and event type
     * @param {NodeListOf} elements A node list, which is an array like object, but not quite an array
     * @param {string} eventType The type of the element E.g. "click", "mouseover"
     * @param {Function} fn the callback function passed to each of the elements.
     * */
    function createEventListeners(elements, eventType, fn) {
        Array.prototype.forEach.call(elements, function(element) {
            element.addEventListener(eventType, fn);
        });
    }

    function triggerEvents(elements, eventType) {
        Array.prototype.forEach.call(elements, function(input) {
            input.dispatchEvent(new Event(eventType));
        });
    }

    /**
     * End Utility functions
     * =======================
     * */

        // Shopping cart section. Hard-coded for now
    var shoppingCartListElement = document.getElementById("shopping-cart-list-section");
    var toggleShoppingCartBtnElement = document.getElementById("toggleShoppingCart");
    var checkoutElement = document.getElementById("checkout-section");

    /**
     * A simple utility used to manage shopping lists
     * @param {Object} config full set of data and options 
     * */
    function ShoppingListManager(config) {
        if (!(this instanceof ShoppingListManager)) {
            return new ShoppingListManager(config);
        }

        this.data = {};
        this.data.itemList = config.data.itemList || [];
        this.data.cartList = config.data.cartList || [];
        // Coupons
        this.data.rowCoupons = config.data.rowCoupons || {};
        this.data.allCoupons = config.data.allCoupons || {};
        this.data.usedCoupons = [];
        // Cart Summary
        this.data.summary = {
            totalPrice: 0,
            totalDiscount: 0,
            totalTax: 0,
            shipping: 0,
            grandTotal: 0
        };
        this.data.taxRate = this.data.taxRate || 0.1;

        // We are going to toggle, so set it to opposite
        this.displayShoppingCart = !(this.data.cartList.length > 0);
        toggleShoppingCart.call(this);

        this.options = config.options || {};
        // helper functions
        this.helpers = {};
        this.domReferences = {};

        // For now, we will not implement observers
        // this.observers = [];
    }

    /**
     * @this ShoppingListManager
     * */
    function initManager() {

        // Set member event listeners so they can be applied
        // when dom elements are rendered
        initMemberEventListeners.call(this);

        // initOptions
        initOptions.call(this);

        // init member event listeners
        initDocFrag.call(this);

        // Initialization logic for DOM elements
        initItemList.call(this);
        initShoppingList.call(this);
        initCheckout.call(this);

        // init DOM cache: uninmplemented
        // initDOMCache.call(this);

        // modal event listener
        initEventListeners.call(this);

        // Observe data
        observe.call(this);

        // Lastly, bind containers
        this.data.itemListEl = document.querySelector(this.options.itemListSelector);
        this.data.cartListEl = document.querySelector(this.options.cartListSelector);
        this.data.checkoutEl = document.querySelector(this.options.checkoutSelector);
    }


    /**
     * Initialization logic
     * ====================================
     * */

    // cart item(s) container
    var cartContainerEl = document.getElementById("shopping-cart-list-section");

    /**
     * Initialize member event listeners
     * */
    function initMemberEventListeners() {
        var that = this;
        /**
         * Event listener
         * If qty is placed below 1, pop up modal to delete item
         * */
        this.changeQtyEventListener = function changeQtyEventListener(evt) {
            var qty = Number(evt.target.value);
            var id = Number(evt.target.dataset.id);
            if (qty <= 0 && evt.target.value !== '') {
                toggleDeleteConfirmModal(id);
                evt.target.stepUp(1);
                return;
            }
            // Only set valid qty values
            if (qty > 0) {
                var cartList = that.data.cartList;
                product = cartList[indexOfItem(cartList, id)];
                product.quantity = qty;
                // Update statistics
                that.updateTotals();
            }
            // Since qty changes can impact coupon discounts, validate
            triggerEvents(document.querySelectorAll(".coupon-input"), 'keyup');
        }

        /**
         * Event listener
         * Remove item from cart
         * */
        this.removeItemFromCartEventListener = function removeItemFromCartEventListener(evt) {
            var id = Number(evt.target.dataset.id);
            var cartList = that.data.cartList;
            var index = indexOfItem(cartList, id);

            if (index !== -1) {
                // Remove from array and DOM
                cartList.splice(index, 1);
                var row = cartContainerEl.querySelectorAll(".item-container")[index];
                // Remove event listeners
                removeRowEventListeners.call(that, row);
                // Remove DOM elements
                cartContainerEl.removeChild(row);
                // Update statistics
                that.updateTotals();
                // Remove any coupons
                removeUsedCouponFromList(id, that.data.usedCoupons);
                // Update coupons if needed
                triggerEvents(document.querySelectorAll(".coupon-input"), 'keyup');
            }

            // Lastly, close modal
            closeDeleteConfirmModal();
        }

        /**
         * Triggered each time a character is entered inside of the input field
         * Check if coupon entered is valid
         * Can only use the same coupons once.
         * */
        this.applyCouponEventListener = function applyCouponEventListener(evt) {
            var couponCode = evt.target.value.trim();
            var incorrectMsgEl = evt.target.nextElementSibling;
            var correctMsgEl = incorrectMsgEl.nextElementSibling;
            var productId = Number(evt.target.getAttribute("data-id"));
            var product = that.data.cartList[indexOfItem(that.data.cartList, productId)];

            var invalidCouponMsg = 'Invalid code. Try again.';
            var usedCoupons = that.data.usedCoupons;

            var isValid = isValidCoupon(couponCode, that.data.rowCoupons);
            var usedCoupon = findUsedCoupon(couponCode, productId, usedCoupons);
            var isUseable = isValid && !usedCoupon;

            if (isUseable) {
                // Add coupon if it is not used
                incorrectMsgEl.style.display = 'none';
                incorrectMsgEl.innerHTML = invalidCouponMsg;
                correctMsgEl.style.display = 'block';
                addDiscount.call(that, productId, that.data.rowCoupons[couponCode]);
            } else if (isValid && usedCoupon) {
                var currentDiscount = usedCoupon.discount * parsePrice(product.price) * product.quantity;
                // Compare discount
                if (currentDiscount > that.data.summary.totalDiscount) {

                    // remove previously used coupon
                    removeUsedCouponFromList(usedCoupon.productId, usedCoupons);
                    removeDiscount.call(that, usedCoupon.productId, that.data.rowCoupons[couponCode]);

                    // Add new coupon
                    addDiscount.call(that, productId, that.data.rowCoupons[couponCode]);
                    usedCoupons.push({ couponCode: couponCode, productId: productId, discount: that.data.rowCoupons[couponCode].discount});

                    // Update
                    incorrectMsgEl.style.display = 'none';
                    incorrectMsgEl.innerHTML = invalidCouponMsg;
                    correctMsgEl.style.display = 'block';

                    // trigger change in identical coupons if discount is greater
                    var couponElements = document.querySelectorAll(".coupon-input");
                    Array.prototype.forEach.call(couponElements, function(element) {
                        if (element.value === couponCode &&
                            Number(element.getAttribute("data-id")) !== productId) {
                                element.value = element.value.substring(0, element.value.length - 1);
                        }
                    });

                    // update all coupon tabs
                    triggerEvents(couponElements, "keyup");

                    triggerEvents(document.querySelectorAll(".qty-input"), "keyup");

                    return;
                } else {
                    incorrectMsgEl.innerHTML = 'Coupon is used elsewhere';
                    incorrectMsgEl.style.display = 'block';
                    correctMsgEl.style.display = 'none';
                }
            } else if (couponCode === '') {
                incorrectMsgEl.style.display = 'none';
                correctMsgEl.style.display = 'none';
                incorrectMsgEl.innerHTML = invalidCouponMsg;
                removeDiscount.call(that, productId, that.data.rowCoupons[couponCode]);
            } else {
                incorrectMsgEl.style.display = 'block';
                correctMsgEl.style.display = 'none';
                incorrectMsgEl.innerHTML = invalidCouponMsg;
                removeDiscount.call(that, productId, that.data.rowCoupons[couponCode]);
            }

            // Prevent duplicate insertion
            if (isUseable) {
                for (var i = 0; i < usedCoupons.length; i++) {
                    if (usedCoupons[i].couponCode === couponCode) {
                        return;
                    }
                }
                usedCoupons.push({ couponCode: couponCode, productId: productId, discount: that.data.rowCoupons[couponCode].discount});
            } else {
                removeUsedCouponFromList(productId, usedCoupons);
            }
        };

        /**
         * Coupon validation for totals
         * */
        this.applyTotalCouponEventListener = function applyTotalCouponEventListener(evt) {
            var couponCode = evt.target.value.trim();
            var incorrectMsgEl = evt.target.nextElementSibling;
            var correctMsgEl = incorrectMsgEl.nextElementSibling;
            var productId = -1; // no product id

            var invalidCouponMsg = 'Invalid code. Try again.';
            var usedCoupons = that.data.usedCoupons;

            var isValid = isValidCoupon(couponCode, that.data.allCoupons);
            var usedCoupon = findUsedCoupon(couponCode, productId, usedCoupons);
            var isUseable = isValid && !usedCoupon;

            if (isUseable) {
                // Add coupon if it is not used
                incorrectMsgEl.style.display = 'none';
                incorrectMsgEl.innerHTML = invalidCouponMsg;
                correctMsgEl.style.display = 'block';
                addDiscount.call(that, productId, that.data.allCoupons[couponCode], true);
            } else if (isValid && usedCoupon) {
                var currentDiscount = 0;
                // Calculate current discount in individual coupons;
                that.data.cartList.forEach(function(item) {
                    currentDiscount += (parsePrice(item.price) * qty) * (1 - usedCoupon.discount);
                });
                if (currentDiscount > that.data.summary.totalDiscount) {

                    // remove previously used coupon
                    removeUsedCouponFromList(productId, usedCoupons);
                    removeDiscount.call(that, productId, true);

                    // Add new coupon
                    addDiscount.call(that, productId, true);
                    usedCoupons.push({ couponCode: couponCode, productId: productId, discount: that.data.allCoupons[couponCode].discount});

                    // Update
                    incorrectMsgEl.style.display = 'none';
                    incorrectMsgEl.innerHTML = invalidCouponMsg;
                    correctMsgEl.style.display = 'block';

                    // trigger change in identical coupons if discount is greater
                    var couponElements = document.querySelectorAll(".coupon-input");
                    Array.prototype.forEach.call(couponElements, function(element) {
                        element.value = element.value.substring(0, element.value.length - 1);
                    });

                    // update all coupon tabs
                    triggerEvents(couponElements, "keyup");

                    triggerEvents(document.querySelectorAll(".qty-input"), "keyup");

                    return;
                } else {
                    incorrectMsgEl.innerHTML = 'Coupon is used elsewhere';
                    incorrectMsgEl.style.display = 'block';
                    correctMsgEl.style.display = 'none';
                }
            } else if (couponCode === '') {
                incorrectMsgEl.style.display = 'none';
                correctMsgEl.style.display = 'none';
                incorrectMsgEl.innerHTML = invalidCouponMsg;
                removeDiscount.call(that, productId, true);
            } else {
                incorrectMsgEl.style.display = 'block';
                correctMsgEl.style.display = 'none';
                incorrectMsgEl.innerHTML = invalidCouponMsg;
                removeDiscount.call(that, productId, true);
            }

            // Prevent duplicate insertion
            if (isUseable) {
                for (var i = 0; i < usedCoupons.length; i++) {
                    if (usedCoupons[i].couponCode === couponCode) {
                        return;
                    }
                }
                usedCoupons.push({ couponCode: couponCode, productId: productId, discount: that.data.allCoupons[couponCode].discount});
            } else {
                removeUsedCouponFromList(productId, usedCoupons, true);
            }
        }
    }

    /**
     * Remove coupon from used list
     * */
    function removeUsedCouponFromList(productId, usedCouponList) {
        for (var i = 0; i < usedCouponList.length; i++) {
            var coupon = usedCouponList[i];
            if (coupon.productId === productId) {
                usedCouponList.splice(i, 1);
                return;
            }
        }
    }

    /**
     * Lookup used coupon for validation purposes
     * @param {String} couponCode the code entered by the user
     * @param {Number} productId the id of the current product
     * */
    function findUsedCoupon(couponCode, productId, usedCouponList) {
        for (var i = 0; i < usedCouponList.length; i++) {
            var coupon = usedCouponList[i];
            if (coupon.couponCode === couponCode && coupon.productId !== productId) {
                return usedCouponList[i];
            }
        }
    }

    // Self-explanatory
    function addDiscount(productId, coupon , isTotalDiscount) {
        var key = isTotalDiscount ? "totalDiscount" : "discount";
        var shoppingCartList = this.data.cartList;
        var index;
        // Apply discount to all items
        if (isTotalDiscount) {
            // apply discount to all
            for (var i = 0; i < shoppingCartList.length; i++) {
                shoppingCartList[i][key] = coupon.discount;
                // trigger change
                shoppingCartList[i].quantity = shoppingCartList[i].quantity;
            }
        } else if ((index = indexOfItem(shoppingCartList, productId)) !== -1) {
            shoppingCartList[index][key] = coupon.discount;
            // Trigger change
            shoppingCartList[index].quantity = shoppingCartList[index].quantity
        }
        this.updateTotals();
    }

    // Self-explanatory
    function removeDiscount(productId, isTotalDiscount) {
        var key = isTotalDiscount ? "totalDiscount" : "discount";
        var shoppingCartList = this.data.cartList;
        var index = indexOfItem(shoppingCartList, productId);
        if (isTotalDiscount) {
            // apply discount to all
            for (var i = 0; i < shoppingCartList.length; i++) {
                shoppingCartList[i][key] = 0;
                // trigger change
                shoppingCartList[i].quantity = shoppingCartList[i].quantity;
            }
        } else if ((index = indexOfItem(shoppingCartList, productId)) !== -1) {
            shoppingCartList[index][key] = 0;
            // trigger change
            shoppingCartList[index].quantity = shoppingCartList[index].quantity;
        }
        this.updateTotals();
    }

    /**
     * Validate single coupon
     * @param {String} couponCode
     * @param {Object} couponRepository
     * */
    function isValidCoupon(couponCode, couponRepository) {
        return couponCode in couponRepository;
    }

    /**
     * init the DOM cache so that DOM can be updated with minimal traversal
     * For now, this will remain un-implemented
     * */
    function initDOMCache() {
        this.domCache = {};
    }

    /**
     * @this options
     * */
    function initOptions() {
        var key, options = this.options
        for (key in options) {
            if (options.hasOwnProperty(key)) {
                this.options[key] = options[key];
            }
        }
    }

    function initDocFrag() {
        var options = this.options;
        var itemTemplate = document.querySelector(options.itemListTemplateSelector);
        var itemDocFrag = this.extractContent(itemTemplate, true);
        // There must be a container
        if (itemDocFrag == null) {
            throw new Error("No container selected from cssSelector " + options.itemListTemplateSelector);
        }

        var cartItemTemplate = document.querySelector(options.cartListTemplateSelector);
        var cartDocFrag = this.extractContent(cartItemTemplate, true);

        if (cartDocFrag == null) {
            throw new Error("No container selected from cssSelector " + options.cartListTemplateSelector);
        }

        // Checkout doc frag
        var checkoutTemplate = document.querySelector(options.checkoutTemplateSelector);
        var checkoutDocFrag = this.extractContent(checkoutTemplate, true);

        // Set properties
        this.itemDocFrag = itemDocFrag;
        this.cartDocFrag = cartDocFrag;
        this.checkoutDocFrag = checkoutDocFrag;
    }

    /**
     * Create DOM elements from list.
     * For now, we don't have to clean up event listeners
     * The only event listeners we will clean up are
     * for the elements added/removed from the shopping cart.
     * @this ShoppingListManager
     * */
    function initItemList() {
        var itemList = this.data.itemList, parser = new DOMParser(), template = this.itemDocFrag.textContent;
        var docFrag = document.createDocumentFragment();

        // Create row elements for each data set
        if (Array.isArray(itemList) && itemList.length) {
            for (var i = 0; i < itemList.length; i++) {
                appendItemRow.call(this, parser, docFrag, itemList[i], template, false);
            }
        }
        // LASTLY, add to the actual DOM.
        // Only appended once to improve performance.
        document.querySelector(this.options.itemListSelector).appendChild(docFrag);
    }

    /**
     * Populate Shopping cart Item list
     * @this ShoppingListManager
     * */
    function initShoppingList() {
        var cartList = this.data.cartList, parser = new DOMParser(), template = this.cartDocFrag.textContent;
        var docFrag = document.createDocumentFragment();

        // Create row elements for each data set
        if (Array.isArray(cartList) && cartList.length) {
            for (var i = 0; i < cartList.length; i++) {
                appendItemRow.call(this, parser, docFrag, cartList[i], template, true);
            }
        }
        // LASTLY, add to the actual DOM.
        // Only appended once to improve performance.
        document.querySelector(this.options.cartListSelector).appendChild(docFrag);
    }

    function initCheckout() {
        var cartList = this.data.cartList, parser = new DOMParser(), template = this.checkoutDocFrag.textContent;
        var docFrag = document.createDocumentFragment();
        // Interpolate string
        var htmlStr = interpolateTemplate.call(this, template, this.data.summary);
        // Create nodes
        var nodes = parser.parseFromString(htmlStr, "text/html").documentElement;
        // Attach event listener
        nodes.querySelector('.total-coupon-input').addEventListener('keyup', this.applyTotalCouponEventListener);

        // Cut out body and html. Attach only what is needed to the document fragment
        docFrag.appendChild(nodes.childNodes[1].childNodes[0]);
        // LASTLY, add to the actual DOM.
        // Only appended once to improve performance.
        document.querySelector(this.options.checkoutSelector).appendChild(docFrag);
    }

    /**
     * Observe all the data that is loaded.
     * Logic is run only during initialization phase.
     * @this ShoppingListManager
     * */
    function observe() {
        var itemList = this.data.itemList;
        var cartList = this.data.cartList;

        // Observe and link data with the DOM
        if (itemList.length) {
            for (var i = 0; i < itemList.length; i++) {
                createObservableDataSet.call(this, itemList[i], this.options.dataUpdated);
            }
        }

        if (cartList.length) {
            for (i = 0; i < cartList.length; i++) {
                createObservableDataSet.call(this, cartList[i], this.options.dataUpdated);
            }
        }

        // Observe shopping cart
        createObservableDataSet.call(this, this.data.summary, this.options.summaryUpdated)

        // Observe shopping item list
        // observeArray.call(this, itemList);
        // Overserve items inside of shopping cart if any
        // observeArray.call(this, cartList);
    }

    /**
     * Attaches notification events to notify us when items are added/removed using the following methods
     *  - push
     *  - splice
     *  Note: this inside of the event function refers to the array object.
     *  HEADS UP: Right now, there are some bugs when observing deletes when multiple items are added to the array
     *  Once the bug is squashed
     * */
    function observeArray(list) {
        var event = this.options.itemAddedToArray.bind(this) || function() {};
        observeArrayMethod(list, "push", event, function() {
            var index;
            for (var i = 0, arrayLen = this.length, l = arguments.length; i < l; i++, arrayLen++) {
                event(arrayLen, this[arrayLen] = arguments[i]);
            }
            return arrayLen;
        });

        var spliceEvent = this.options.itemRemovedFromArray.bind(this) || function() {};
        observeArrayMethod(list, "splice", spliceEvent, function(index, howMany) {
            var item = Array.prototype.splice.call(this, index, howMany);
            for (var endIndex = howMany + index; howMany < endIndex; howMany) {
                delete this[howMany];
            }
            spliceEvent(index + item.length - 1, item);
            return item;
        });
    }

    /**
     * Observe a specific event in an array.
     * @param {Array} list The array to observe
     * @param {String} method The method to observe
     * @param {Function} event The event to emit when changes are made.
     * */
    function observeArrayMethod(list, method, event, valueCb) {
        Object.defineProperty(list, method, {
            configurable: false,
            enumerable: false, // hide from for...in
            writable: false,
            value: valueCb
        });
    }

    var removeFromCartBtn = document.querySelector('.remove-from-cart');

    /**
     * Event listeners
     * =================================
     * */
    function initEventListeners() {
        var that = this;
        // modal close event listeners
        createEventListeners(document.querySelectorAll(".close-modal, .overlay"), 'click', function(evt) {
            closeDeleteConfirmModal(evt.target.dataset.id);
        });
        // Remove from cart event
        removeFromCartBtn.addEventListener('click', function(evt) {
            that.removeItemFromCartEventListener(evt);
        });
        // toggle cart
        toggleShoppingCartBtnElement.addEventListener('click',  toggleShoppingCart.bind(this));
    }

    /**
     * Toggle shopping cart based on current status
     * If it is hidden, this event will show it.
     * If it is shown, it will hide the shopping cart.
     * */
    function toggleShoppingCart(evt) {
        this.displayShoppingCart = !this.displayShoppingCart;
        // toggle
        if (this.displayShoppingCart) {
            shoppingCartListElement.classList.remove("hidden");
            checkoutElement.classList.remove("hidden");
            toggleShoppingCartBtnElement.innerHTML = "&#9776;&nbsp;Hide";
        } else {
            shoppingCartListElement.classList.add("hidden");
            checkoutElement.classList.add("hidden");
            toggleShoppingCartBtnElement.innerHTML = "&#9776;&nbsp;Show";
        }
    }

    // Delete confirmation modal element
    var deleteModalEl = document.getElementById("deleteModal");

    /**
     * Toggle modal based on its current state.*
     * @param {Element} modal The target modal element
     * */
    function modalToggler(modal) {
        // Toggle the modal.
        var overlay = document.getElementById("modalOverlay");
        var removeBtn = modal.querySelector('.remove-from-cart');
        /**
         * Toggle modal based on its current state.
         * If it is opened, it will close. Otherwise, it will open
         *
         * @param {Number} id The event object triggered by button click
         * @param {String} state. The desired effect that you want to see.
         * If unspecified, default behaviour is 'toggle'
         * 1. 'Toggle' - Toggle to the other state. If opened, will close.
         * If closed, will open
         * 2. 'close' - Close the target modal.
         * 3. 'open' - Open the target modal.
         * */
        return function toggleModal(id, state) {
            removeBtn.setAttribute("data-id", id);
            if (state === "open") {
                modal.classList.remove("hidden");
                overlay.classList.remove("hidden");
            } else if (state === "close") {
                modal.classList.add("hidden");
                overlay.classList.add("hidden");
                // Toggle
            } else {
                if (modal.classList.contains("hidden")) {
                    modal.classList.remove("hidden");
                    overlay.classList.remove("hidden");
                } else {
                    modal.classList.add("hidden");
                    overlay.classList.add("hidden");
                }
            }
        };
    }

    /**
     * READ ME: IMPORTANT
     * =======================================
     * Attaching the data of the id can be dangerous, especially
     * if the server is not running parameterized queries/updates on the backend
     * Even if it is, it can still be very dangerous, as smart hackers
     * can use that to extract variety of sensitive data.
     * */
    // Used for toggling delete
    var toggleModalElement = modalToggler(deleteModalEl);

    /**
     * Toggle Modal
     * @param {Number} id The id of the product to modify
     * */
    function toggleDeleteConfirmModal(id) {
        toggleModalElement(id);
    }

    /**
     * Open Modal
     * @param {Number} id The id of the product to modify
     * */
    function openDeleteConfirmModal(id) {
        toggleModalElement(id, 'open');
    }

    /**
     * close Modal
     * @param {Number} id The id of the product to modify
     * */
    function closeDeleteConfirmModal(id) {
        toggleModalElement(id, 'close');
    }

    /**
     * Appends row elements to document fragment passed and attaches appropriate event listeners.
     * Ideally event listener adding will be done through the templating engine,
     * but that can be added later once I consolidate my acquired knowledge and refactor the code.
     *
     * @param {DOMParser} parser. dom Parser object to parse HTML string
     * @param {DocumentFragment} docFrag the row will be appended to this document fragment item
     * @param {Object} productData
     * @param {template} template the html template used to render the row
     * @this {ShoppingListManager}
     * */
    function appendItemRow(parser, docFrag, productData, template, isShoppingList) {
        // Interpolate string
        var htmlStr = interpolateTemplate.call(this, template, productData);
        // Create nodes - There are better ways of doing this,
        // but for now, this will do
        var nodes = parser.parseFromString(htmlStr, "text/html").documentElement;

        // Attach event listeners accordingly based on whether it is a regular item on the list
        // Or if it is a row on the shopping cart.
        if (isShoppingList) {

            // Remove item from cart Event
            // =====================================
            var removeBtn = nodes.querySelector(".btn-remove");
            removeBtn.addEventListener('click' , this.removeFromCart);

            // change Qty Event
            // =====================================
            var qtyInput = nodes.querySelector('.qty-input');
            qtyInput.addEventListener('input', this.changeQtyEventListener);

            // Coupon event for row items
            // ======================================
            var couponInput = nodes.querySelector('.coupon-input');
            couponInput.addEventListener('keyup', this.applyCouponEventListener);

            // Set data so that it is passed down via the event object.
            qtyInput.data = productData;
            removeFromCartBtn.data = productData;
            removeBtn.data = productData;
        } else {
            // Add to shopping cart event
            // ======================================
            var addBtn = nodes.querySelector(".btn-add-to-cart");
            addBtn.addEventListener('click' , this.addToCart.bind(this, productData, addBtn));
        }
        // Cut out body and html. Attach only what is needed to the document fragment
        docFrag.appendChild(nodes.childNodes[1].childNodes[0]);
    }

    /**
     * Prevent possible memory leaks in older
     * browsers by removing event listeners
     * @param {Element} rowEl The row element
     * */
    function removeRowEventListeners(rowEl) {
        // Remove item from cart Event
        // =====================================
        var removeBtn = rowEl.querySelector(".btn-remove");
        removeBtn.removeEventListener('click' , this.removeFromCart);

        // change Qty Event
        // =====================================
        var qtyInput = rowEl.querySelector('.qty-input');
        qtyInput.removeEventListener('input', this.changeQtyEventListener);

        // Coupon event for row items
        // ======================================
        var couponInput = rowEl.querySelector('.coupon-input');
        couponInput.removeEventListener('keyup', this.applyCouponEventListener);
    }

    /**
     * Private Methods
     * =============================
     * */

    /**
     * Print message if debug mode is enabled
     * @param {String} message. The message to display.
     * @this ShoppingListManager
     * */
    function printDebugLog(message) {
        if (this.options.debugEnabled) {
            console.warn(message);
        }
    }

    /**
     * Update the get and set property of data
     * Ensures that data when set, propagattes to the DOM accorindgly
     * @param {Object} data a plain old JavaScript object containing the dataset to observe.
     * @param {Function} cb The function that will run when the data value changes.
     * */
    function createObservableDataSet(data, cb) {
        var that = this;
        Object.keys(data).forEach(function(key, index) {
            var value = data[key];
            if (cb) {
                reactifyData.call(that, data, key, value, index, cb.bind(data));
            } else {
                reactifyData.call(that, data, key, value, index);
            }
        });
    }

    // Get interpolation E.g.
    // Property:      {{ test }},
    // Helper method: {{ @testMethod(param1, param2) }}
    var INTERPOLATION_REGEX = /{{\s*([\$\w]+(?:\([\w,\s]+\))?)\s*}}/g;
    /**
     * Quick and dirty way of performing string interpolations.
     * We will write out a more effective solution later.
     * Handles function calls and interpolation and create
     * DOM mappings so that data can be reactively updated
     *
     * @param {String} htmlStr the html string
     * @param {Object} object The data containing the object
     * */
    function interpolateTemplate(htmlStr, data) {
        var that = this;
        var domReferences = this.domReferences;
        // Use replace but don't do anything
        return htmlStr.replace(INTERPOLATION_REGEX, function(val, match, offset, inputStr) {
            // For now, no cache
            // Later on, we will generate a unique sequence
            // So that it is not hard coded / tied down to this set of data
            // parse string and return the result of the executed method / function

            // Create cache for quick manipulation
            // Used later for future virtual DOM implementation
            if (!domReferences.hasOwnProperty(match)) {
                var htmlNode = htmlToElement(getInterpolatedHtmlString(offset, inputStr));
                domReferences[match] = htmlNode;
            }

            // Just for the sake of readability
            var isATemplateFunction = match.charAt(0) === "$";
            if (isATemplateFunction) {
               return executeStringInterpolatedMethod.call(that, match, data);
            } else {
                return (match === "this") ? data : data[match];
            }
        })
    }

    /**
     * @param {String} HTML representing a single element
     * @return {Element}
     */
    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }

    /**
     * Get the html string that contains
     * string interpolation
     * @param {Number} offset The index of the first '{' character
     * in the interpolated string.
     * @param {String} the html string
     * @return {String}
     * */
    function getInterpolatedHtmlString(offset, inputStr) {
        var charArr = [], char = '', endOffset = offset;
        while (char !== '<' || offset < 0) {
            char = inputStr[offset];
            offset--;
        }
        while (char !== ">" || endOffset > inputStr.length) {
            char = inputStr[endOffset];
            endOffset++;
        }
        return inputStr.substring(offset, endOffset);
    }

    /**
     * @param {String} interpolatedStr The interpolated String
     * of a method E.g. property in {{ method(param1, param2) }}
     * @param {Object} data The current data set.
     * @return {Array} an array containing the parameters;
     * */
    function getArgumentsFromMethodString(interpolatedStr, data) {
        return interpolatedStr.substring(interpolatedStr.indexOf("(") + 1,
                interpolatedStr.length - 1).split(/\s*,\s*/)
                    .map(function(key) {
                        if (data.hasOwnProperty(key)) {
                            return data[key];
                        }
                    });
    }

    /**
     * Parse the string and execute method;
     * For the sake of a bit of performance gain, we wi
     * */
    function executeStringInterpolatedMethod(string, data) {
        var indexOfBracket = string.indexOf("(");
        var methodName = string.substring(1, indexOfBracket);
        var arguments = getArgumentsFromMethodString(string, data);

        // execute and return results of helper method if it exists.
        if (this.helpers.hasOwnProperty(methodName)) {
            return this.helpers[methodName].apply(this, arguments)
        }
        throw new Error("Helper method " + methodName + " does not exist");
    }

    /**
     * Create reactive data components.
     * Right now, we will only worry about data on the primitive level
     * @param {Object} the target object
     * @param {String} key
     * @param value the Value. For now, we will only worry about primitives.
     * @param {Number} index the index of the data in the array.
     * @param {Function} cb an optional callback that is triggered when data is updated
     * */
    function reactifyData(obj, key, value, index, cb) {
        var that = this;
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function() {
                // printDebugLog.call(that, 'getting key: "'+ key + '" and value: ' + value);
                return value;
            },
            set: function(newValue) {
                // For now, hard code notify method via callback
                cb(newValue, value, key, index);
                // Debug log
                printDebugLog.call(that, 'setting key: "' + key + '" to: ' + newValue + ". At the moment, DOM will not be updated accordingly T_T");
                // Set new value after callback is triggered
                value = newValue;
            }
        });
    }

    /**
     * Trim possible empty head/tail text and comment
     * nodes inside a parent.
     *
     * @param {Node} node
     */
    function trimNode(node) {
        var child;
        // Wanted to try this.
        // child will be assigned value of first child.
        // The expression on the far right hand side is
        // the only one evaluated by the while loop.
        while ((child = node.firstChild, isTrimmable(child))) {
            node.removeChild(child);
        }
        while ((child = node.lastChild, isTrimmable(child))) {
            node.removeChild(child);
        }
    }

    /**
     * nodeType 3 refers to the text node
     * nodeType 8 refers to a comment node
     * */
    function isTrimmable(node) {
        return node && (node.nodeType === 3 && !node.data.trim() || node.nodeType === 8);
    }

    /**
     * Cart statistic-related functions
     * ==========================================
     * */
    /**
     * @param {String} priceStr The price string (currently in dollars). E.g. "$49.11"
     */
    function parsePrice(priceStr) {
        if (isNaN(Number(priceStr.charAt(0)))) {
            return parseFloat(priceStr.substring(1));
        }
        return parseFloat(priceStr);
    }

    /**
     * Public API/Methods
     * ===========================================
     * */

    /**
     * initialize library
     * */
    ShoppingListManager.prototype.init = function init() {
        initManager.call(this);
    };

    /**
     * Extract raw content inside an element into a temporary
     * container div
     *
     * @param {Element} el
     * @param {Boolean} asDocFrag create {DocumentFragment} instead of {Element} if <code>true</code>
     * @return {Element|DocumentFragment}
     */
    ShoppingListManager.prototype.extractContent = function extractContent(el, asDocFrag) {
        var child;
        var rawContent;
        if (el.hasChildNodes()) {
            trimNode(el);
            rawContent = asDocFrag ? document.createDocumentFragment() : document.createElement('div');
            while (child = el.firstChild) {
                rawContent.appendChild(child);
            }
        }
        return rawContent;
    };

    /**
     * Wanted a similar feature that I saw in handlebars, so here it is.
     * @param {String} key
     * @param {Function} The job that the function will be performing. Accepts n parameters
     * delimited by a comma
     * E.g. <div>{{ @printTotal(param1, param2, param3, ... ]}
     * */
    ShoppingListManager.prototype.registerHelper = function registerHelper(key, fn) {
        key = key.toString();   // Ensure that it is a string
        if (typeof fn === "function") {
            this.helpers[key] = fn.bind(this);
        } else {
            throw new Error("Second parameter must be a function");
        }
    };

    /**
     * Allows users to add items to the cart.
     * */
    ShoppingListManager.prototype.addToCart = function addToCart(item, cb) {
        var cartList = this.data.cartList;
        var index = indexOfItem(cartList, item.id);
        // Add new item only if it doesnt exist already
        if (index === -1) {
            var itemCopy = deepCopy(item);
            // Push a deep copy into the cart
            this.data.cartList.push(itemCopy);
            // Observe new data set
            createObservableDataSet.call(this, itemCopy, this.options.dataUpdated);
            // Update DOM
            var docFrag = document.createDocumentFragment();
            appendItemRow.call(this, new DOMParser(), docFrag, item, this.cartDocFrag.textContent, true);
            document.querySelector(this.options.cartListSelector).appendChild(docFrag);

            // show cart if hidden
            if (!this.displayShoppingCart) {
                toggleShoppingCart.call(this);
            }

            // update totals
            this.updateTotals();
        }
    };

    /**
     * Search cart for item
     * */
    ShoppingListManager.prototype.indexOf = function indexOf(id) {
        return indexOfItem(this.data.cartList, id);
    }

    /**
     * Remove item from cart.
     * */
    ShoppingListManager.prototype.removeFromCart = function removeFromCart(evt) {
        openDeleteConfirmModal(evt.target.data.id);
    };

    /**
     * Update totals
     * */
    ShoppingListManager.prototype.updateTotals = function updateTotals() {
        // For now, we won't use any caching features, but run a full calculation each time
        var itemList = this.data.cartList;
        var total = 0, discount = 0, totalDiscount = 0;
        for (var i = 0; i < itemList.length; i++) {
            var item = itemList[i];
            var price = parsePrice(item.price) * item.quantity;
            var currentDiscount = price * item.discount;
            var currentTotalDiscount = price * item.totalDiscount;
            // update discount
            discount += currentDiscount;
            totalDiscount += currentTotalDiscount
            total += price;
        }
        // lastly, subtract discount
        var summary = this.data.summary;
        summary.totalPrice = total;
        summary.totalTax = (total - discount) * this.data.taxRate;
        summary.totalDiscount = discount > totalDiscount ? discount : totalDiscount;
        summary.shipping = 0;
        summary.grandTotal = (summary.totalTax + (total - discount)) + summary.shipping;
    };

    // Lastly, expose to global scope
    if (window.ShoppingListManager === undefined) {
        window.ShoppingListManager = ShoppingListManager;
    }

})();
/**
 * End simple shopping cart manager
 * ===================================
 * */

/**
 * Begin Shopping Cart Page Logic
 * ===================================
 * */
(function() {
    /**
     * Dummy data containing list of items
     * from an imaginary data source.
     *
     * Later on, we can fetch the data from
     * a URL, a file or database on the server.
     * ==========================================
     * */
    var itemList = [
        {
            id: 1,
            typeId: 1,
            productName: "Java Concurrency in action",
            maker: "Joshua Blotch",
            price: "$38.50",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" +
            "                        In rhoncus nulla ut quam cursus commodo non a ante. Quisque volutpat congue ante\n" +
            "                        id pellentesque. Suspendisse sit amet consequat magna. Quisque mattis varius lacinia.\n" +
            "                        Mauris iaculis, odio quis aliquet finibus, augue velit suscipit arcu, a\n" +
            "                        hendrerit nibh odio vel nunc. Morbi ut elit volutpat dolor porta eleifend condimentum\n" +
            "                        ac ante. Aenean blandit nulla sit amet mi euismod volutpat. Nulla aliquam tempus lectus,\n" +
            "                        ac volutpat velit interdum vitae. Nullam tempor nulla nec lectus sollicitudin euismod ac at libero.\n" +
            "                        Nam a metus ac risus sagittis efficitur eget eu lacus. Nam feugiat dignissim elit ac pharetra.\n" +
            "                        Morbi ut dictum ligula, sed venenatis est."
        },
        {
            id: 2,
            typeId: 2,
            productName: "Plugable USB 3.0 Universal Laptop Docking Station for Windows (Dual Video HDMI & DVI / VGA, Gigabit Ethernet, Audio, 6 USB Ports)",
            maker: "Pluggable",
            price: "$102.31",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x350",
            description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" +
            "                        In rhoncus nulla ut quam cursus commodo non a ante. Quisque volutpat congue ante\n" +
            "                        id pellentesque. Suspendisse sit amet consequat magna. Quisque mattis varius lacinia.\n" +
            "                        Mauris iaculis, odio quis aliquet finibus, augue velit suscipit arcu, a\n" +
            "                        hendrerit nibh odio vel nunc. Morbi ut elit volutpat dolor porta eleifend condimentum\n" +
            "                        ac ante. Aenean blandit nulla sit amet mi euismod volutpat. Nulla aliquam tempus lectus,\n" +
            "                        ac volutpat velit interdum vitae. Nullam tempor nulla nec lectus sollicitudin euismod ac at libero.\n" +
            "                        Nam a metus ac risus sagittis efficitur eget eu lacus. Nam feugiat dignissim elit ac pharetra.\n" +
            "                        Morbi ut dictum ligula, sed venenatis est."
        },
        {
            id: 3,
            typeId: 1,
            productName: "JavaScript - The Good Parts",
            maker: "Douglas Crockford",
            price: "$49.11",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: "A very good book written by Douglas Crockford. A must read for intermediate JavaScript developers."
        },
        {
            id: 4,
            typeId: 1,
            productName: "Effective Java (2nd Edition)",
            maker: "Joshua Blotch",
            price: "$49.11",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: "Slightly outdated, but still worth a read. Remember that it will not contain references or mention some of the newer features introduced in Java 7+."
        },
        {
            id: 5,
            typeId: 1,
            productName: "Designing Data-Intensive Applications",
            maker: "Martin Kleppmann",
            price: "$43.00",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" +
            "                        In rhoncus nulla ut quam cursus commodo non a ante. Quisque volutpat congue ante\n" +
            "                        id pellentesque. Suspendisse sit amet consequat magna. Quisque mattis varius lacinia.\n" +
            "                        Mauris iaculis, odio quis aliquet finibus, augue velit suscipit arcu, a\n" +
            "                        hendrerit nibh odio vel nunc. Morbi ut elit volutpat dolor porta eleifend condimentum\n" +
            "                        ac ante. Aenean blandit nulla sit amet mi euismod volutpat. Nulla aliquam tempus lectus,\n" +
            "                        ac volutpat velit interdum vitae. Nullam tempor nulla nec lectus sollicitudin euismod ac at libero.\n" +
            "                        Nam a metus ac risus sagittis efficitur eget eu lacus. Nam feugiat dignissim elit ac pharetra.\n" +
            "                        Morbi ut dictum ligula, sed venenatis est."
        },
        {
            id: 6,
            typeId: 1,
            productName: "SQL Tuning",
            maker: "Dan Tow",
            price: "$29.90",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" +
            "                        In rhoncus nulla ut quam cursus commodo non a ante. Quisque volutpat congue ante\n" +
            "                        id pellentesque. Suspendisse sit amet consequat magna. Quisque mattis varius lacinia.\n" +
            "                        Mauris iaculis, odio quis aliquet finibus, augue velit suscipit arcu, a\n" +
            "                        hendrerit nibh odio vel nunc. Morbi ut elit volutpat dolor porta eleifend condimentum\n" +
            "                        ac ante. Aenean blandit nulla sit amet mi euismod volutpat. Nulla aliquam tempus lectus,\n" +
            "                        ac volutpat velit interdum vitae. Nullam tempor nulla nec lectus sollicitudin euismod ac at libero.\n" +
            "                        Nam a metus ac risus sagittis efficitur eget eu lacus. Nam feugiat dignissim elit ac pharetra.\n" +
            "                        Morbi ut dictum ligula, sed venenatis est."
        },
        {
            id: 7,
            typeId: 1,
            productName: "C Programming in Action (Second Edition)",
            maker: "K.N. King",
            price: "$55.00",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" +
            "                        In rhoncus nulla ut quam cursus commodo non a ante. Quisque volutpat congue ante\n" +
            "                        id pellentesque. Suspendisse sit amet consequat magna. Quisque mattis varius lacinia.\n" +
            "                        Mauris iaculis, odio quis aliquet finibus, augue velit suscipit arcu, a\n" +
            "                        hendrerit nibh odio vel nunc. Morbi ut elit volutpat dolor porta eleifend condimentum\n" +
            "                        ac ante. Aenean blandit nulla sit amet mi euismod volutpat. Nulla aliquam tempus lectus,\n" +
            "                        ac volutpat velit interdum vitae. Nullam tempor nulla nec lectus sollicitudin euismod ac at libero.\n" +
            "                        Nam a metus ac risus sagittis efficitur eget eu lacus. Nam feugiat dignissim elit ac pharetra.\n" +
            "                        Morbi ut dictum ligula, sed venenatis est."
        },
        {
            id: 8,
            typeId: 1,
            productName: "Design Patterns: Elements of Reusable Object-Oriented Software",
            maker: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
            price: "$27.68",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" +
            "                        In rhoncus nulla ut quam cursus commodo non a ante. Quisque volutpat congue ante\n" +
            "                        id pellentesque. Suspendisse sit amet consequat magna. Quisque mattis varius lacinia.\n" +
            "                        Mauris iaculis, odio quis aliquet finibus, augue velit suscipit arcu, a\n" +
            "                        hendrerit nibh odio vel nunc. Morbi ut elit volutpat dolor porta eleifend condimentum\n" +
            "                        ac ante. Aenean blandit nulla sit amet mi euismod volutpat. Nulla aliquam tempus lectus,\n" +
            "                        ac volutpat velit interdum vitae. Nullam tempor nulla nec lectus sollicitudin euismod ac at libero.\n" +
            "                        Nam a metus ac risus sagittis efficitur eget eu lacus. Nam feugiat dignissim elit ac pharetra.\n" +
            "                        Morbi ut dictum ligula, sed venenatis est."
        },
        {
            id: 9,
            typeId: 1,
            productName: "Effective Java (3rd Edition)",
            maker: "Joshua Blotch",
            price: "$49.11",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" +
            "                        In rhoncus nulla ut quam cursus commodo non a ante. Quisque volutpat congue ante\n" +
            "                        id pellentesque. Suspendisse sit amet consequat magna. Quisque mattis varius lacinia.\n" +
            "                        Mauris iaculis, odio quis aliquet finibus, augue velit suscipit arcu, a\n" +
            "                        hendrerit nibh odio vel nunc. Morbi ut elit volutpat dolor porta eleifend condimentum\n" +
            "                        ac ante. Aenean blandit nulla sit amet mi euismod volutpat. Nulla aliquam tempus lectus,\n" +
            "                        ac volutpat velit interdum vitae. Nullam tempor nulla nec lectus sollicitudin euismod ac at libero.\n" +
            "                        Nam a metus ac risus sagittis efficitur eget eu lacus. Nam feugiat dignissim elit ac pharetra.\n" +
            "                        Morbi ut dictum ligula, sed venenatis est."
        },
        {
            id: 10,
            typeId: 1,
            productName: "Introduction to Algorithms, 3rd Edition (MIT Press)",
            maker: "Thormas H. Cormen, Charles E. Leiserson",
            price: "$49.11",
            discount: 0,
            totalDiscount: 0,   // Applied when total discount coupon is inserted
            quantity: 1,
            imgUrl: "http://via.placeholder.com/250x250",
            description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" +
            "                        In rhoncus nulla ut quam cursus commodo non a ante. Quisque volutpat congue ante\n" +
            "                        id pellentesque. Suspendisse sit amet consequat magna. Quisque mattis varius lacinia.\n" +
            "                        Mauris iaculis, odio quis aliquet finibus, augue velit suscipit arcu, a\n" +
            "                        hendrerit nibh odio vel nunc. Morbi ut elit volutpat dolor porta eleifend condimentum\n" +
            "                        ac ante. Aenean blandit nulla sit amet mi euismod volutpat. Nulla aliquam tempus lectus,\n" +
            "                        ac volutpat velit interdum vitae. Nullam tempor nulla nec lectus sollicitudin euismod ac at libero.\n" +
            "                        Nam a metus ac risus sagittis efficitur eget eu lacus. Nam feugiat dignissim elit ac pharetra.\n" +
            "                        Morbi ut dictum ligula, sed venenatis est."
        },
    ];

    // Object that is managing the shopping list
    var manager;
    // Tax rate
    var TAX_RATE = 0.1

    /**
     * Initialize all the helpers required for displaying data
     * Inspired by handlebars.js
     * */
    function initializeHelpers(mgr) {
        /**
         * For handling US dollar inputs
         * Other currencies might need a different approach
         * therefore, this is just for show
         * Price is a string, not a float or double
         * @param {String} priceStr The price string E.g. "$49.11"
         * */
        mgr.registerHelper("printPrice", function(price) {
            if (typeof price === "number") {
                price = "$" + price.toFixed(2);
            }
            var totalPriceList = price.split(".");
            var dollar = "<sup class='currency'>" + totalPriceList[0][0] + "</sup>" + totalPriceList[0].substr(1);
            var cent;
            if (totalPriceList.length > 1) {
                cent = "<sup class='cent'>" + totalPriceList[1] + "</sup>";
            }
            return cent ? dollar + cent : dollar;
        });

        /**
         * Display total price for the item that is being displayed
         * */
        mgr.registerHelper("calculateRowTotal", function(price, quantity, discount) {
            var priceFloat = parseFloat(price.substr(1, price.length));
            return this.helpers.printPrice("$" + ((priceFloat * quantity) - (priceFloat * discount)).toFixed(2));
        });
    }

    /**
     * init page
     * */
    function init() {

        // Fake coupons.
        // off total prices
        // Key would be the coupon code, since that is unique.
        var allCoupons = {
            "15OFFALL": {
                discount: 0.15
            }
        };

        // % off single item
        var rowCoupons = {
            "5OFF": {
                discount: 0.05
            }
        };

        // initialize shopping list manager
        manager = new ShoppingListManager({
            data: {
                itemList: itemList,
                cartList: [],
                allCoupons: allCoupons,
                rowCoupons: rowCoupons,
                taxRate: TAX_RATE,
            },
            options: {
                // Print get/set messages for debugging
                debugEnabled: true,
                // Template selectors
                itemListTemplateSelector: '#item-list-template',
                cartListTemplateSelector: '#shopping-cart-list-template',
                checkoutTemplateSelector: '#checkout-template',
                // TODO: Add checkout template selector

                // html element selector
                itemListSelector: "#shopping-list-section",
                cartListSelector: '#shopping-cart-list-section',
                checkoutSelector: '#checkout-section',

                // Triggered when data updated: E.g. Quality
                // I guess a first step to creating a reactive library.
                // Next step would be writing up a virtual DOM implementation
                dataUpdated: function(newVal, val, key) {
                    // Change price when discount is applied
                    if (key === 'discount') {
                        var index = manager.indexOf(this.id);
                        var priceEl = manager.data.cartListEl.querySelectorAll('.qty-input')[index]
                            .parentElement.previousElementSibling;
                        var parsedPrice;
                        if (isNaN(Number(this.price.charAt(0)))) {
                            parsedPrice = parseFloat(this.price.substring(1));
                        } else {
                            parsedPrice = this.price;
                        }
                        // Apply discount
                        parsedPrice = parsedPrice * (1 - newVal);
                        priceEl.innerHTML = manager.helpers.printPrice(parsedPrice);
                    }
                    // we are interested in quantity changes
                    // Update price
                    if (key === "quantity") {
                        var index = manager.indexOf(this.id);
                        var totalRowQtyEl = manager.data.cartListEl.querySelectorAll('.qty-input')[index]
                                            .parentElement.nextElementSibling;
                        // 1. update row total price
                        totalRowQtyEl.innerHTML = manager.helpers.calculateRowTotal(this.price, newVal, this.discount);
                    }
                },
                // Triggered when summary data is updated
                summaryUpdated: function(newVal, val, key) {
                    var newPrice = manager.helpers.printPrice(newVal);
                    switch (key) {
                        case "totalPrice":
                            document.getElementById("totalPrice").innerHTML = newPrice;
                            break;
                        case "totalDiscount":
                            document.getElementById("totalDiscount").innerHTML = newPrice;
                            break;
                        case "totalShipping":
                            // Hard coded for now
                            document.getElementById("totalShipping").innerHTML = manager.helpers.printPrice("$0.00");
                            break;
                        case "totalTax":
                            document.getElementById("totalTax").innerHTML = newPrice;
                            break;
                        case "grandTotal":
                            document.getElementById("grandTotal").innerHTML = newPrice;
                            break;
                    }
                },
                // Triggered when item is removed from array
                /*itemRemovedFromArray: function(index, item) {
                    console.log("removed: " + index);
                },
                // Triggered when item is added to array.
                itemAddedToArray: function(index, item) {
                    console.log("item added to array");
                    console.log(this);
                }*/
            }
        });

        // initialize helpers
        initializeHelpers(manager);
        // Lastly, initialize the manager.
        manager.init();
    }
    init();
})();