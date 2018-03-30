## Reactive Accordion

This is a simple reactive accordion that I made. If data is changed by the user, the change will immediately be reflected on the DOM.
For now, it uses a simple caching system where it holds the DOM objects in memory to minimize DOM traversal.

Below is a sample code snippet on initializing the plugin.

```JavaScript
 // Initialize accordion with three items
 var accordion = new ReactiveAccordion([
        {
            title: "Appetizers",
            content: "<div style='color:red; font-weight: bold;'>Check out our tasty apps!</div></br><b>Happy hour menu - half off!!</b></br></br><ul><li>Chicken wings (6) - 5.99$</li></ul>",
            icon: [
                "<i class='fa fa-arrow-circle-down'></i>", // Open
                "<i class='fa fa-arrow-circle-right'></i>"   // Closed
            ],
            useHtml: true
        }, {
            title: "Second title",
            content: "<div style='color:red;'>I am not red</div>. I DON'T allow HTML"
        }, {
            title: "I am more interesting",
            icon: [
                "<i class='fa fa-arrow-down'></i>",      // Open
                "<i class='fa fa-arrow-right'></i>"      // Closed
            ],
            content: "Here is more text: Lorel ipsum doloads ohsadsad oasdo ahdoisah odsap jdpaosjd pojsa dposaj Lorel ipsum doloads ohsadsad oasdo ahdoisah odsap jdpaosjd pojsa dposaj. Lorel ipsum doloads ohsadsad oasdo ahdoisah odsap jdpaosjd pojsa dposaj. Lorel ipsum doloads ohsadsad oasdo ahdoisah odsap jdpaosjd pojsa dposaj. Lorel ipsum doloads ohsadsad oasdo ahdoisah odsap jdpaosjd pojsa dposaj.adhas doas odsadasd a."
        }
    ], {
        el: "#accordion",    // CSS selector
        debug: true,
        multiSelect: false   // Allow multiple accordions to be opened simultaneously.
    });
    // change the data and watch the first accordion's title update
     accordion.data[0].title = "Watch me change";
```
## Demo

A working sample can be found [here](https://jwlee89.github.io/bov-web-components/bov-css-project-3-accordion/)

## API

### Instance Options

Instance options are passed in as the second argument of the Constructor. They are stored un

Below are some options that can be provided to the accordion.

`el` - `String`: The css selector of the container of the accordion
`debug` - `Boolean`: Set to true, if you want data updates to be logged onto the console.
`multiSelect` - `Boolean`: Set to true in order to have multiple accordions opened simultaneously. If set to false, opening up another accordion will close the current one.
`toggleAccordion` - `Function`: event listener function that is triggered when the title is clicked. By default, it opens the accordion. Can be overriden by users for additional customization.


### Data

Data is passed as the first argument as an `array` of objects. The object has the following properties

* `title` - `String`: The title of the accordion item.
* `content` - `String`: The content of the accordion. 
* `useHtml` - `boolean`: If set to true, users can write HTML string to the `title` and `content`
* `icon` -`Array` : An array of length `2`. The first item represents the icon that appears when the accordion is opened. The second item represents the icon that appears when the accordion is closed. 

### Methods

The api is very simple so far. It only consists of the following methods: 

1. `add`
2. `remove`

#### `add(data, index)`

Add data to the accordion dynamically at runtime. 

* `data` - `Object`: The data that will be inserted. Upon insertion, the data will immediately be made reactive.
* `index` - `Integer`: The index at which to add the data. If the index is not defined, the data will be added at the end.

#### `remove(index)`

Removes the data from memory and also updates the DOM, removing any event listeners attached.

* `index` - The index (zero based) of the accordion item. 0 represents the first item. 1 represents the second item and so on.
