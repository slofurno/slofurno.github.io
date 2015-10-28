---
title: meteor-sucks.go
layout: post
---

Meteor seems to be pretty hot right now, and I've been watching some people build their first meteor apps. Even when they struggled getting things to work, people seemed genuinely enamored with meteor, so I decided to give Meteor a shot and play the role of devils advocate.

In general I prefer to build things out of small composable pieces. In contrast, Meteor is less of a framework and more of a way of life. Because the entire stack is javascript, it provides Meteor the opportunity to own everything from your database to your dom rendering, and everything in between. While Meteor makes it very easy to do things the Meteor way, what happens when you want to do something slightly differently?

At the core of Meteor is the idea of a reactive data source. This is essentially an observable collection with callback methods any time objects in the collection are added, removed, or changed. Meteor calls an object which fulfills this interface a cursor, and by publishing a cursor on the server, Meteor will automagically forward changes in your collection to every attached client.

Out of the box Meteor provides you with a mongodb backed reactive collection. While this gives you something very powerful and useful, it is also very inflexible. Each collection is backed by a table in mongodb, and every change to your collection must go through mongo before being broadcast to users.

<img class="centered" src="{{site.baseurl}}/static/mongo2.gif">

Notice how delayed the updates on the right start to get compared to the source on the left when using Mongo (above). We could use the <a href="http://devblog.me/meteor-redis.html">meteor-redis</a> plugin, but this is nodejs afterall, why do we need to go through redis when javascript has this built in key value store called object.

To get a quick and dirty object based reactive collection going, we need to satisfy the basic functionality that Meteor expects from a collection.


    var isCursor = function (c) {
      return c && c._publishCursor;
    };



  https://github.com/meteor/meteor/blob/53cc021064a1dabc02ea811e2a8c2d9977d34c4a/packages/mongo/collection.js
  Mongo.Collection._publishCursor = function (cursor, sub, collection) {
    var observeHandle = cursor.observeChanges({
      added: function (id, fields) {
        sub.added(collection, id, fields);
      },
      changed: function (id, fields) {
        sub.changed(collection, id, fields);
      },
      removed: function (id) {
        sub.removed(collection, id);
      }
    });
  ...
  };


The meteor documentation details the cursor and collection interface, but I've found the minimal implmentation looks like


  Cursor={forEach, map, fetch, count, observeChanges, _publishCursor}
  Collection={insert, update, upsert, find}


Now this is just a minimal implementation of a meteor collection. There is more that needs to be done to integrate it into Meteor so it works correctly with client side subscriptions, but I've found two shortcuts to doing so. One is to monkey patch a dummy meteor collection, letting it setup the routes and connection, and just replacing the internal mongo collection with our own.


    //both
    Players = new Meteor.Collection('players');

    //server
    Meteor.startup(function () {
      Players._collection = _Players;
    });

    Meteor.publish("allplayers", function () {
      return Players.find();
    });

    //client
    Meteor.subscribe('allplayers');


<img class="centered" src="{{site.baseurl}}/static/array2.gif">

Compare the result with the original.

Of course this is just a toy example, but now that we have dispelled some of the meteor magics, you can use it as a starting point for your own custom reactive collections. One simple example could be a collection which immediately processes all updates in memory, but debounces them before saving to mongo. Now you can keep the speedup without losing the  persistence of a mongo backed collection.
