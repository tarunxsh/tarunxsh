---
title: "PostgreSQL advisory locks"
pubDate: 2025-01-02
description: "Exploring postgreSQL advisory locks"
ogImage: "https://tarunxsh.xyz/profile.jpeg"
author: "Tarunesh Gautam"
image:
  url: "https://docs.astro.build/assets/rose.webp"
  alt: "alt"
tags: ["postgreSQL", "databases"]
---

Full blog post **soon....** Till then you can refer my notes on this 


### WIP DRAFT

mechanisms to control concurrency and to avoid data corruption

Advisory locks help an application define a meaning to the lock, i.e. if you want to acquire a lock while you perform certain tasks in your application you can do that using advisory locks.

The idea is to acquire a lock for a custom ID you generate. E.g., here, for every task, an ID is generated. In a distributed system, if one worker process has already acquired a lock on a task using its ID, the others won’t be able to. Once the business logic is executed the lock is released. Since each task has different lock IDs, the processes can acquire locks simultaneously.



There are different locks that the database provides out of the box and most of them are managed by the database until you specify something specific. PostgreSQL provides row level, table level and page level locks.

But these are locks used by the DB and the application doesn’t have any control over them. That’s where advisory locks come in.

You can acquire an advisory lock on a session level or a transaction level. Just like the other locks, if the lock is acquired on a transaction level, the lock is released when the transaction is complete. Similarly, a session level lock is released when the session ends or when you manually release it.

[pg_advisory_lock works but not pg_try_advisory_lock](https://stackoverflow.com/questions/54038185/pg-advisory-lock-works-but-not-pg-try-advisory-lock)

You do not need a table to execute a function. Use just

```scss
SELECT pg_advisory_lock(123);

```

Note that if you use a table (like in the question) the function is executed as many times as the number of rows in the table. If the table is empty, the function is not executed at all.

[A Practical Guide to using Advisory Locks in your Application](https://softwareengineeringwk.substack.com/p/a-practical-guide-to-using-advisory)

[Isolation in DBMS & Advisory Locks](https://softwareengineeringwk.substack.com/p/isolation-in-dbms-and-advisory-locks)

[Distributed Locking With PostgreSQL](https://haykot.dev/blog/distributed-locking-with-postgre-sql/)

[Advisory Locks in PostgreSQL](https://hashrocket.com/blog/posts/advisory-locks-in-postgres#implementation)

[Richard Clayton - Distributed Locking with Postgres Advisory Locks](https://rclayton.silvrback.com/distributed-locking-with-postgres-advisory-locks)

[A Practical Guide to using Advisory Locks in your Application](https://softwareengineeringwk.substack.com/p/a-practical-guide-to-using-advisory)

[Advisory Locks and How to Use Them](https://shiroyasha.io/advisory-locks-and-how-to-use-them.html)

[Distributed Locks with Postgres (Advisory Locks) and Knex.js - Inextenso - A blog by Nicola Zanon](https://www.inextenso.dev/distributed-locks-with-postgres-advisory-locks-and-knex-js)

[How to Use PostgreSQL Locks: Easy Step-by-Step Explanation](https://hevodata.com/learn/postgresql-locks/)

:wq