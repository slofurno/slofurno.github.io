---
title: minesweeper.ex
layout: post
---

A couple months ago I spent a weekend working on a multiplayer minesweeper game using elixir and react. In the past I had implemented my own dynamic process lookup and pubsub with a GenServer, but this time decided it was worth the effort to figure out how to call gproc from elixir.

gproc's interface maps perfectly to the basic problems I had to solve, such as: "where is the process for game 5?", "list all game processes", or "send this message to a players in game 5". It also monitors said processes, so we don't have to handle removing finished games or disconnected players.

After my initial hackathon, the project idled until I picked it up a few days ago and gave some serious thought to sharing it. my primary concern became the scalability of the game map generation. Things ran fine for small board sizes, but as this was a multiplayer game, I wanted the possibility of generating huge boards in realtime. I was seeing long runtimes and a huge spike in memory usage during generation.

Because of the nature of calculating neighbors for the minesweeper board, the generation had to be done in two steps. The first would determine if a square had a bomb, and the second would count the adjacent squares containing bombs. I could have broken up this cost by lazily computing neighbors whenever a player clicked on a square, but I knew that to already be a potentially slow operation, and felt I could do better.

    MIX_ENV="prod mix compile" mix profile.fprof -e Minesweepers.Game.new --callers > ms.profile

Using fprof to profile, I was left with runtimes that didn't quite add up. I could tell some significant time was being spent in various map/reduce anonymous function calls, but the majority of runtime wasn't attributed to anything. Still, I rewrote the generation code, attempting to make things more efficient, in particular preferring to use recursion over Enum methods that required anonymous functions. After a few commits, I had shaved off about half of the runtime, and fprof was giving me less useful information then ever.

As this is a completely cpu bound operation, I was guessing that most of the remaining overhead was coming from gc caused by modifications to immutable data structures. I have been writing some crappy c code lately in an attempty to implement the new channels interface on David Fowler's github https://github.com/davidfowl/Channels, intended to be a replacement for csharp's stream interface. It opens the possibility for zero copy reads/writes with only a slightly more awkward interface. Following that trend, I decided to try writing a nif function to generate the initial game board. Each square would only require a byte, and after returning to elixir, we could map said byte to the elixir struct representation of our squares.

The erlang manual covers nifs, and gives some examples http://erlang.org/doc/man/erl_nif.html, and there is also some useful examples in the test suite of the erlang repo on github. Save a couple seg faults, my initial attempt seemed to work great, except for some concerns over its runtime. The erlang reference asserts a nif should limit itself to about 1ms consecutive runtime, lest it negatively impacts the beam scheduler.

The solution is doing the processing in increments and yielding back to the vm. In our first nif call, we do all our allocations, and then recursively schedule the processing function, passing an arg to keep track of our progress. As to the number of iterations per call, we start off with an educated guess, then time each runtime and update accordingly. A 1000x1000 square board may take about 40 ~1ms iterations to complete, but from elixir it will still seem like one function call.

    average generation time for a 400x400 board over 50 iterations
    original     1204 +/- 27ms
    optimized    678  +/- 46ms
    nif          165  +/- 16ms

A final concern is memory usage for large games. While the final memory usage of our game state is relatively small, memory usage was spiking dangerously high during the initial processing. Even though the nif was returning only one byte per square, or about 1mb of memory for a 1000x1000 square game, memory usage would spike by about 2gb while building a map of coordinate tuples to structs. When I started testing 2000x2000 games, beam was consistently crashing with out of memory errors. At this time I can only guess that these allocations are from either map insertions or struct overhead. For whatever reason, switching to a record for representing the squares didn't really reduce this memory spike, but it did stop the crashes.
