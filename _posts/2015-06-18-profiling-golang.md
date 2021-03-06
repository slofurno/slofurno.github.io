---
layout: post
title: profiling golang
---

About a month ago I was working on my submission to the third go challenge, building a web application which produces mosaics from uploaded images. Two winners were announced, and my submissioned received a mention as being "very close", with feedback that while my mosaics were "excellent", the runtime was "pretty slow". This is uncharacteristic of my applications, as I am conscious of performance, but I was new to go at the time, and was focusing on learning the language. I knew my runtimes were high (90 seconds), but I did not know how easy it could be to profile my code at a higer resolution with the right tools.

<img src="static/gochallenge.jpg">


After the winners were revealed, the source code of all entries were made public on github. Looking at the winning submissions, I realized that their image processing was much simplier then mine. While this should have been a winning advantage for me, any benefits were far outweighed by the increase on the application's runtime. The effort I had put into a more robust and correct image matching algorithm paled in comparision to the importance of the overall user experience, where speed and responsiveness are highly rated.


When I was younger I recieved a black and white mosaic of abraham lincoln as a gift. Even though it was only composed of maybe 20 by 40 images, i remember being impressed at how clear the overall picture was, even though the content of the images was all rather uniform. The images were either landscapes or portraits, yet at a distance the details of the images blurred and their relative lightness or darkness was most important.


Thus I began with the idea that the intensity of the underlying images was key for producing a good mosaic. After doing some research, I found that there was a common mistake that many naive, and even professional, image scaling algorithms made, which skewed the intensity of the resulting images. You can <a href="http://www.4p8.com/eric.brasseur/gamma.html">read more about this effect here</a>, which results from averaging colors as if the intensity encoded in the rgb format were on a linear scale, when it is really on a power scale to pack more visible detail into a limited 8 bit space. Simply taking the rgb colors and averaging them is analogous to trying to find the hypotenuse of a triangle with the equation A + B = C.


My tests showed that the go standard library drawing package made this error. My solution was to write my own code to downsample images by first transforming into a linear colorspace, averaging, and then transforming back to srgb. I could tell my mosaics were improved by this, particularly around areas of detail such as facial features, however this now meant doing an expensive math operation on every pixel of every source image in my pre processing stage.


    func sRGBtoLinear(s uint8) float64 {

    var z float64 = float64(s) / 255
    var L float64

    if z > 0.04045 {
        L = math.Pow((z+0.055)/(1.055), 2.4)
    } else {
        L = z / 12.92
    }

    return L
    }


Using Dave Cheney's <a href="https://github.com/pkg/profile">profile package</a>, we find that more then half of our overall runtime (including network operations to download our source images) takes place in this conversion function, specifically 48% of our runtime, or 52 seconds, is spent calling the math.Pow function.

Now that we have established that we have a function containing expensive math calls with only 256 possible inputs which is called millions of times, a possible solution becomes obvious. The new conversion function becomes a lookup and we precompute the results for all possible inputs.

A new profile confirms the improvement, from 62.65s to 3.04s spent in pre-processing.

