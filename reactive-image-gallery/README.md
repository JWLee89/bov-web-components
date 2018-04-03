## Reactive Image Gallery

A sample reactive image gallery that utiilizes a virtual DOM. 

Credits to @deathmood for the virtual dom implementation (customized slightly to fit my needs). 

To read the article on the virtual dom written by @deathmood, click [here](https://medium.com/@deathmood/write-your-virtual-dom-2-props-events-a957608f5c76).

## Sample Initialization Code Snippet

```JavaScript
  var imageRoot = document.getElementById("imageGallery");
  gallery = new ReactiveGallery({
      rootElement: imageRoot,
      data: [
          {
              src:"http://runt-of-the-web.com/wordpress/wp-content/uploads/2013/11/doge-meme-plant.jpg",
              alt: "doge",
              title:  "Doge again!",
              caption: "So creativity! Much tired."
          },
          {
              src:"https://images.freeimages.com/images/large-previews/310/resting-peacefully-1574880.jpg",
              caption: "A sleeping child looks so peaceful :)",
              title: "Sleeping Child",
              alt: "Sleeping child"
          },
          {
              src:"http://www.ghanalive.tv/wp-content/uploads/2018/03/web-mr-bean-atkinson-bbc-uk.jpg",
              title: "He needs no captions",
          },
          {
              src:"https://thomasmountainborn.com/wp-content/uploads/2016/09/Unity-OpenCV.png",
              alt:"OPEN CV",
              caption: "No title here. OpenCV (Open Source Computer Vision Library) is released under a BSD license and hence it’s free for both academic and commercial use."
          },
          {
              src:"https://pmcvariety.files.wordpress.com/2014/10/rush-hour-tv-show.jpg?w=1000&h=563&crop=1",
              alt:"My Favorite Movie Series",
              title: "Rush hour",
              caption: "The Jackie Chan and Chris Tucker combo is without a doubt, my favorite combination in any Movie that I've ever watched."
          },
          {
              src:"https://avatars3.githubusercontent.com/u/26952818?s=460&v=4",
              title: "Moi",
              caption: "I am running out of ideas on what kind of images to add."
          },
          {
              src:"http://runt-of-the-web.com/wordpress/wp-content/uploads/2013/11/doge-dj.jpg",
              alt: "Doge memes",
              caption: "Doge memes are cool I guess"
          }
      ],
      options: {
          autoPlay: {
              enabled: true,
              timePeriod: 10000           // Every 10 seconds, move to the next item
          },
          startingIndex: 3,               // Start from fourth image
          thumbnailPosition: "top",
          stretchImage: true,             // Not fully implemented yet
          showThumbnails: true,           // Not yet implemented
          lazyLoad: true                  // Not yet implemented
      }
  });
```

## Demo

A working demo can be found [here](https://jwlee89.github.io/bov-web-components/reactive-image-gallery/)

## API 

Because this is more of an experimental exercise, there is currently no public methods, just options. Because this is a reactive component,
updating the data should propagate the changes directly to the DOM.

### Data

The component accepts an `array` of JavaScript `objects` with the following properties.

* `src`: The src/url of the image.
* `alt` (optional): The alt tag text of the image.
* `title` (optional): The title of the image. If not specified or a falsey value, the element will be hidden from view.
* `caption` (optional): The caption of the image displayed at the bottom. If not specified or a falsey value, the element will be hidden from view.


### Options

* `autoPlay`
  * `enabled` - Set to true to enable autoplay
  * `timePeriod` - The millisecond timeperiod value of each frame being displayed before moving onto the next.
* `startingIndex` - An `integer` value dictating which index image to display on startup.
* `thumbnailPosition` - Possible values: `top` or `bottom`. Used to specify the position of the thumbnail gallery.
