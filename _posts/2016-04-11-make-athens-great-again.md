---
title: make athens great again
layout: post
---

WIP

3 master servers with:
mesos-master, zookeeper, marathon, consul server, docker

n slave servers with:
mesos-slave, consul, docker

we will wrap our applications in containerbuddy, which will use consul to keep track
 of the services we depend on, and let us trigger events in our app (sighup etc), to
 reload updated configs.

we will need to set aside 3-5 ips as our master cluster. From there we can use
 ansible to setup all of our dependencies, and generate configs based on the master ips.

make sure our docker cmd is in array form to avoid running sh -c
(will stop sigterm progagation)

sudo -i $(pwd)/bin/mesos-master.sh &&\
--work_dirvar/lib/mesos &&\
--zk=zk://localhost:2181/mesos &&\
--quorum=1 &&\
--hostname=13.90.251.112

sudo -i $(pwd)/mesos-slave.sh &&\
--master=zk://13.90.251.112:2181/mesos &&\
--resources=ports:[1-65000] &&\
--hostname=13.90.251.112 &&\
--docker_stop_timeout=10secs &&\
--executor_shutdown_grace_period=15secs &&\
--containerizers=docker,mesos

./bin/start --master zk://zk1.foo.bar:2181,zk2.foo.bar:2181/mesos &&\
--zk zk://zk1.foo.bar:2181,zk2.foo.bar:2181/marathon

consul agent -server &&\
-data-dir="/tmp/consul" &&\
-bootstrap-expect 3 &&\
-advertise=13.90.251.112 &&\
-client=0.0.0.0 &&\
-ui-dir .

* download and extract the ui codes
