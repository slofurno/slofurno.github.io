---
title: minesweeper.ex
layout: post
---

A couple months ago I spent a weekend working on a multiplayer minesweeper game using elixir and react. More recently I decided to iterate on it, improve its design, and prepare it for a release.

I tried to keep the server as simple as possible, using a setup that could generally apply to any realtime web app. I use Cowboy and Plug to serve and route requests, including websocket connections. I also choose to put my web server behind nginx, which handles https and serving static content, as well as routing api and websocket requests to our webserver.

Unlike other mmo minesweeper games, which have near infinite boards and whose games never end, I wanted to create large but finite games with a clear time limit and winner. This meant our server needed to be able to dynamically create and add games to our supervision tree, keep track of which games were in progress, and lookup a particular game process by some unique id. We would also have to track the players of each game and maintain a way of broadcasting game events to the processes representing users' websocket connections.

For this I went with gproc, which seems to have been created to solve just these kinds of problems. Game processes are registered with a schema of {:game, id}, where id is a uuid. Game lookup and broadcasting can then be done as:

    :gproc.whereis_name({:n, :l, {:game, id}})

    :gproc.send({:p, :l, {:game, id}}, {:game_event, e})

getting the syntax for querying all game ids was a little more difficult, but I wound up with:

     match = {{:n, :l, {:game, :_}}, :_, :_}
     guard = []
     res = [:"$$"]
     for [{_, _, {:game, id}}|_] <- :gproc.select([{match, guard, res}]), do: id


With the essentials implemented, I started thinking about the experience of dynamically creating games. I choose to represent the game board as a map of coordinate tuples to a record representing a game square. The process of creating a new game was done in two steps, first generating the squares and inserting them into our map, and then a second processing step to calculate neighbors. While for small minesweeper games this was fast, there was a significant delay in creating larger games. Not only was there a delay, but I was measuring high memory usage, and occasional beam crashes. Obviously something had to be done to make this a more performant and stable process.

To investigate, I ran fprof.

    MIX_ENV="prod mix compile" mix profile.fprof -e Minesweepers.Game.new --callers > ms.profile

Unfortunately, the profile didn't reveal any low hanging fruit. Because maps in elixir are immutable, I assumed a significant chunk of this time was spent repeatedly modifying the underlying tree structure and performing the associated garbage collection. I decided it was worth a shot to use native code to generate the initial game state.

The erlang manual covers nifs, and gives some guidelines for their use http://erlang.org/doc/man/erl_nif.html. One assertion that seemed particularly relevant was that nifs block the beam scheudler and should limit themselves to about 1ms of consecutive runtime. Because my nif's runtime would depend on the game size, I went with an implementation that was flexible enough to break up into small parts, between which could yield back to the scheduler. Since runtime will vary between cpus, I start off with a conservative estimate and measure each runtime, adjusting the number of iterations per function call with a goal of just under 1ms.

    average generation time for a 400x400 board over 50 iterations
    original     1204 +/- 27ms
    optimized    678  +/- 46ms
    nif          165  +/- 16ms

I was satisfied with the results, getting the performance I needed without losing the assertive elixir code I wanted
