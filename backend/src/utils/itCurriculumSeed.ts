import { Subject } from '../models/Subject.js';
import { Module } from '../models/Module.js';
import { Quiz, IQuestion } from '../models/Quiz.js';

type SeedQuestion = [questionText: string, options: [string, string, string, string], correctIndex: number, explanation: string];

interface SeedModule {
  title: string;
  summary: string;
  textContent: string;
  quiz: SeedQuestion[];
}

interface SeedSubject {
  name: string;
  code: string;
  term: string;
  yearLevel: string;
  description: string;
  modules: SeedModule[];
}

export const IT_CURRICULUM: SeedSubject[] = [
  {
    name: 'Fundamentals of Programming',
    code: 'IT101',
    term: '1st Semester',
    yearLevel: '1st Year',
    description: 'Core programming concepts using Python: variables, data types, control flow, functions, and basic problem solving.',
    modules: [
      {
        title: 'Module 1: Variables, Data Types, and Operators',
        summary: 'How programs store values, the primitive data types, and the operators used to compute with them.',
        textContent: `### 1.1 What Is a Variable?
A **variable** is a named reference to a value stored in memory. In Python, a variable is created the moment you assign to it:

\`\`\`python
student_name = "Alex"
units_enrolled = 21
gwa = 1.75
is_regular = True
\`\`\`

### 1.2 Primitive Data Types
- **int**: whole numbers such as \`21\` or \`-4\`.
- **float**: numbers with a decimal point such as \`1.75\`.
- **str**: text enclosed in quotes such as \`"BSIT"\`.
- **bool**: the logical values \`True\` and \`False\`.

Use \`type(value)\` to check a value's type at runtime.

### 1.3 Operators
- **Arithmetic**: \`+\`, \`-\`, \`*\`, \`/\` (true division), \`//\` (floor division), \`%\` (modulus), \`**\` (exponent).
- **Comparison**: \`==\`, \`!=\`, \`<\`, \`>\`, \`<=\`, \`>=\` always produce a bool.
- **Logical**: \`and\`, \`or\`, \`not\` combine boolean expressions.

Example: \`17 // 5\` evaluates to \`3\` while \`17 % 5\` evaluates to \`2\`.`,
        quiz: [
          ['Which Python data type stores the value 1.75?', ['int', 'float', 'str', 'bool'], 1, 'Numbers with a decimal point are floats.'],
          ['What does the expression 17 % 5 evaluate to?', ['3', '3.4', '2', '85'], 2, 'The modulus operator returns the remainder of division: 17 = 5 x 3 + 2.'],
          ['What does the expression 17 // 5 evaluate to?', ['3', '2', '3.4', '4'], 0, 'Floor division discards the fractional part, leaving 3.'],
          ['Which operator checks whether two values are equal?', ['=', '==', '!=', ':='], 1, 'A single = assigns a value; == compares two values.'],
          ['What type does the comparison 5 > 3 produce?', ['int', 'str', 'float', 'bool'], 3, 'Comparison operators always produce a boolean value.'],
        ],
      },
      {
        title: 'Module 2: Control Flow - Selection and Repetition',
        summary: 'Making decisions with if/elif/else and repeating work with for and while loops.',
        textContent: `### 2.1 Selection Statements
Selection lets a program choose which block of code to execute:

\`\`\`python
if grade >= 90:
    remark = "Excellent"
elif grade >= 75:
    remark = "Passed"
else:
    remark = "Failed"
\`\`\`

Only the **first** condition that evaluates to \`True\` runs its block.

### 2.2 The for Loop
A **for** loop iterates over each item of a sequence. \`range(start, stop)\` produces integers from start up to but **not including** stop:

\`\`\`python
for week in range(1, 4):
    print("Week", week)   # prints 1, 2, 3
\`\`\`

### 2.3 The while Loop
A **while** loop repeats as long as its condition remains true. Always make sure the loop body changes the condition, otherwise you create an **infinite loop**.

### 2.4 Loop Control
- **break** exits the loop immediately.
- **continue** skips the rest of the current iteration and moves to the next one.`,
        quiz: [
          ['How many times does the body of "for i in range(1, 4):" execute?', ['4', '2', '3', '5'], 2, 'range(1, 4) yields 1, 2, and 3; the stop value is excluded.'],
          ['Which keyword immediately exits a loop?', ['continue', 'break', 'pass', 'return'], 1, 'break terminates the nearest enclosing loop.'],
          ['In an if/elif/else chain, how many blocks run when several conditions are true?', ['All true blocks', 'Only the last true block', 'Only the first true block', 'None of them'], 2, 'Evaluation stops at the first condition that is true.'],
          ['What happens when a while loop condition never becomes false?', ['The program raises a SyntaxError', 'An infinite loop occurs', 'The loop runs exactly once', 'Python skips the loop'], 1, 'Without a change to its condition, a while loop repeats forever.'],
          ['Which keyword skips to the next iteration of a loop?', ['continue', 'break', 'skip', 'next'], 0, 'continue jumps back to the top of the loop for the next iteration.'],
        ],
      },
      {
        title: 'Module 3: Functions and Modular Programming',
        summary: 'Defining reusable functions, passing parameters, returning values, and understanding variable scope.',
        textContent: `### 3.1 Defining Functions
A **function** is a named, reusable block of code. It is defined with the \`def\` keyword:

\`\`\`python
def compute_average(scores):
    return sum(scores) / len(scores)

final = compute_average([88, 92, 79])
\`\`\`

### 3.2 Parameters and Arguments
- **Parameters** are the names listed in the function definition (\`scores\`).
- **Arguments** are the actual values passed during the call (\`[88, 92, 79]\`).
- **Default parameters** provide a fallback value: \`def greet(name="Student")\`.

### 3.3 Return Values
The **return** statement sends a value back to the caller and ends the function. A function without a return statement returns \`None\`.

### 3.4 Scope
- **Local variables** exist only inside the function that created them.
- **Global variables** are defined at the top level of a module.

### 3.5 Why Modularize?
Functions reduce duplication, make code easier to test, and let teams divide large programs into smaller, well named pieces.`,
        quiz: [
          ['Which keyword defines a function in Python?', ['function', 'def', 'func', 'lambda'], 1, 'Named functions are declared with def.'],
          ['What does a Python function return when it has no return statement?', ['0', 'An empty string', 'None', 'False'], 2, 'Python implicitly returns None.'],
          ['In "def greet(name):", what is name?', ['An argument', 'A parameter', 'A return value', 'A global variable'], 1, 'Names in the definition are parameters; values passed in a call are arguments.'],
          ['Where can a local variable be accessed?', ['Anywhere in the program', 'Only inside the function that created it', 'Only in other modules', 'Only after the program ends'], 1, 'Local scope is limited to the function body.'],
          ['Which is a main benefit of using functions?', ['Programs always run faster', 'Code is reused instead of duplicated', 'Variables no longer need names', 'Loops become unnecessary'], 1, 'Functions package logic once so it can be reused and tested.'],
        ],
      },
    ],
  },
  {
    name: 'Database Management Systems',
    code: 'IT201',
    term: '1st Semester',
    yearLevel: '2nd Year',
    description: 'Relational database design, SQL querying, normalization, and transaction management.',
    modules: [
      {
        title: 'Module 1: The Relational Model and ER Diagrams',
        summary: 'Tables, keys, relationships, and how entity relationship diagrams model real world data.',
        textContent: `### 1.1 The Relational Model
A **relational database** organizes data into **tables** (relations). Each row is a **record** (tuple) and each column is an **attribute**.

### 1.2 Keys
- **Primary key**: an attribute that uniquely identifies each row, such as \`student_id\`. It cannot be NULL.
- **Candidate key**: any attribute set that could serve as the primary key.
- **Foreign key**: an attribute that references the primary key of another table, enforcing **referential integrity**.
- **Composite key**: a primary key made of two or more columns.

### 1.3 Entity Relationship Diagrams
An **ERD** visually models a database before it is built:
- **Entities** (rectangles) represent things such as Student or Subject.
- **Attributes** (ovals) describe entities.
- **Relationships** (diamonds) connect entities.

### 1.4 Cardinality
- **One-to-one (1:1)**: one student has one ID card.
- **One-to-many (1:N)**: one faculty member teaches many sections.
- **Many-to-many (M:N)**: many students enroll in many subjects. An M:N relationship is implemented with a **junction table** such as \`enrollments\`.`,
        quiz: [
          ['What uniquely identifies each row in a table?', ['Foreign key', 'Primary key', 'Index', 'Attribute'], 1, 'A primary key is unique and non-null for every row.'],
          ['A column that references the primary key of another table is called a:', ['Candidate key', 'Composite key', 'Foreign key', 'Super view'], 2, 'Foreign keys link tables and enforce referential integrity.'],
          ['How is a many-to-many relationship implemented in a relational database?', ['With a junction table', 'With a single wide table', 'With a NULL primary key', 'With a stored procedure'], 0, 'A junction table holds pairs of foreign keys from both sides.'],
          ['In an ER diagram, entities are usually drawn as:', ['Ovals', 'Diamonds', 'Rectangles', 'Arrows'], 2, 'Rectangles are entities, ovals are attributes, diamonds are relationships.'],
          ['One faculty member teaching many sections is an example of which cardinality?', ['One-to-one', 'One-to-many', 'Many-to-many', 'Zero-to-zero'], 1, 'One faculty record relates to many section records.'],
        ],
      },
      {
        title: 'Module 2: Structured Query Language (SQL)',
        summary: 'Retrieving and manipulating data with SELECT, filtering, joins, aggregation, and DML statements.',
        textContent: `### 2.1 SQL Sublanguages
- **DDL** (Data Definition Language): \`CREATE\`, \`ALTER\`, \`DROP\` define structure.
- **DML** (Data Manipulation Language): \`INSERT\`, \`UPDATE\`, \`DELETE\` change data.
- **DQL** (Data Query Language): \`SELECT\` retrieves data.

### 2.2 Basic Queries
\`\`\`sql
SELECT last_name, section
FROM students
WHERE year_level = 2
ORDER BY last_name ASC;
\`\`\`

### 2.3 Joins
- **INNER JOIN** returns only rows with matching values in both tables.
- **LEFT JOIN** returns every row of the left table plus matches from the right, filling NULL where no match exists.

\`\`\`sql
SELECT s.last_name, e.subject_code
FROM students s
INNER JOIN enrollments e ON e.student_id = s.student_id;
\`\`\`

### 2.4 Aggregation
Aggregate functions such as \`COUNT\`, \`SUM\`, \`AVG\`, \`MIN\`, and \`MAX\` summarize rows. **GROUP BY** forms groups and **HAVING** filters those groups after aggregation, whereas **WHERE** filters individual rows before aggregation.`,
        quiz: [
          ['Which SQL statement retrieves data from a table?', ['INSERT', 'UPDATE', 'SELECT', 'CREATE'], 2, 'SELECT is the query statement.'],
          ['CREATE, ALTER, and DROP belong to which SQL sublanguage?', ['DML', 'DDL', 'DCL', 'TCL'], 1, 'Data Definition Language statements define database structure.'],
          ['Which join returns all rows of the left table even when there is no match?', ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'SELF JOIN'], 1, 'LEFT JOIN keeps unmatched left rows and fills NULLs on the right.'],
          ['Which clause filters groups after aggregation?', ['WHERE', 'ORDER BY', 'HAVING', 'FROM'], 2, 'HAVING applies conditions to groups created by GROUP BY.'],
          ['Which function counts the number of rows in a result?', ['SUM', 'COUNT', 'AVG', 'MAX'], 1, 'COUNT returns how many rows match.'],
        ],
      },
      {
        title: 'Module 3: Normalization and Transactions',
        summary: 'Removing redundancy with normal forms and protecting data with ACID transactions.',
        textContent: `### 3.1 Why Normalize?
Poorly designed tables suffer from **anomalies**: update anomalies (changing data in many places), insertion anomalies, and deletion anomalies. **Normalization** organizes tables to reduce redundancy.

### 3.2 Normal Forms
- **First Normal Form (1NF)**: every column holds **atomic** values and there are no repeating groups.
- **Second Normal Form (2NF)**: 1NF plus no **partial dependency**; every non-key attribute depends on the whole composite key.
- **Third Normal Form (3NF)**: 2NF plus no **transitive dependency**; non-key attributes depend only on the key.

### 3.3 Transactions
A **transaction** is a group of operations treated as a single unit of work, such as transferring tuition payment from one account to another.

\`\`\`sql
BEGIN;
UPDATE accounts SET balance = balance - 5000 WHERE id = 1;
UPDATE accounts SET balance = balance + 5000 WHERE id = 2;
COMMIT;
\`\`\`

\`ROLLBACK\` undoes every change made since the transaction began.

### 3.4 ACID Properties
- **Atomicity**: all operations succeed or none do.
- **Consistency**: a transaction moves the database from one valid state to another.
- **Isolation**: concurrent transactions do not interfere with each other.
- **Durability**: committed changes survive crashes and power loss.`,
        quiz: [
          ['A table where every column holds atomic values with no repeating groups is in at least:', ['1NF', '2NF', '3NF', 'BCNF'], 0, 'Atomic values and no repeating groups define First Normal Form.'],
          ['Removing transitive dependencies brings a table into:', ['1NF', '2NF', '3NF', '0NF'], 2, 'Third Normal Form eliminates transitive dependencies.'],
          ['Which ACID property guarantees that all operations succeed or none do?', ['Isolation', 'Durability', 'Consistency', 'Atomicity'], 3, 'Atomicity treats the transaction as indivisible.'],
          ['Which command undoes all changes made in the current transaction?', ['COMMIT', 'ROLLBACK', 'DELETE', 'TRUNCATE'], 1, 'ROLLBACK reverts the transaction to its starting point.'],
          ['Which ACID property ensures committed data survives a crash?', ['Durability', 'Atomicity', 'Isolation', 'Consistency'], 0, 'Durability means committed changes are permanent.'],
        ],
      },
    ],
  },
  {
    name: 'Data Communications and Networking',
    code: 'IT202',
    term: '2nd Semester',
    yearLevel: '2nd Year',
    description: 'Network models, IP addressing and subnetting, and the core protocols that run the internet.',
    modules: [
      {
        title: 'Module 1: Network Models - OSI and TCP/IP',
        summary: 'The layered models that describe how data travels across a network and the devices at each layer.',
        textContent: `### 1.1 Why Layered Models?
Layering splits networking into smaller problems. Each layer provides services to the layer above and relies on the layer below.

### 1.2 The OSI Model (7 Layers)
1. **Physical**: transmits raw bits over cables, fiber, or radio.
2. **Data Link**: frames, MAC addresses, and switches.
3. **Network**: logical addressing (IP) and routing between networks; routers operate here.
4. **Transport**: end-to-end delivery with TCP or UDP and port numbers.
5. **Session**: establishes and manages sessions between applications.
6. **Presentation**: data formatting, encryption, and compression.
7. **Application**: network services used by applications such as HTTP and DNS.

### 1.3 The TCP/IP Model
The practical internet model uses four layers: **Network Access**, **Internet**, **Transport**, and **Application**.

### 1.4 Encapsulation
As data moves down the stack, each layer adds its own header. The data unit names change by layer: **segment** (Transport), **packet** (Network), **frame** (Data Link), and **bits** (Physical).`,
        quiz: [
          ['How many layers does the OSI model have?', ['4', '5', '7', '9'], 2, 'OSI defines seven layers from Physical to Application.'],
          ['At which OSI layer do routers primarily operate?', ['Data Link', 'Network', 'Transport', 'Session'], 1, 'Routers forward packets using IP addresses at Layer 3.'],
          ['MAC addresses are used at which OSI layer?', ['Physical', 'Data Link', 'Network', 'Application'], 1, 'The Data Link layer frames data and addresses it with MAC addresses.'],
          ['What is the data unit at the Network layer called?', ['Segment', 'Frame', 'Packet', 'Bit'], 2, 'Layer 3 data units are packets.'],
          ['How many layers does the TCP/IP model have?', ['4', '3', '6', '7'], 0, 'Network Access, Internet, Transport, and Application.'],
        ],
      },
      {
        title: 'Module 2: IP Addressing and Subnetting',
        summary: 'IPv4 address structure, private ranges, CIDR notation, and dividing networks into subnets.',
        textContent: `### 2.1 IPv4 Addresses
An IPv4 address is **32 bits** long, written as four decimal octets such as \`192.168.10.25\`. Each address has a **network portion** and a **host portion**, separated by the **subnet mask**.

### 2.2 CIDR Notation
CIDR writes the number of network bits after a slash. \`192.168.10.0/24\` means the first 24 bits are the network, equivalent to the mask \`255.255.255.0\`.

### 2.3 Calculating Hosts
Usable hosts per subnet = **2^h - 2**, where h is the number of host bits. Two addresses are reserved: the **network address** and the **broadcast address**.
- /24 leaves 8 host bits: 2^8 - 2 = **254** usable hosts.
- /26 leaves 6 host bits: 2^6 - 2 = **62** usable hosts.

### 2.4 Private Address Ranges (RFC 1918)
- \`10.0.0.0/8\`
- \`172.16.0.0/12\`
- \`192.168.0.0/16\`

Private addresses are not routed on the public internet; **NAT** translates them to a public address.

### 2.5 IPv6
IPv6 uses **128-bit** addresses written in hexadecimal, such as \`2001:db8::1\`, solving IPv4 address exhaustion.`,
        quiz: [
          ['How many bits are in an IPv4 address?', ['16', '32', '64', '128'], 1, 'IPv4 addresses are 32 bits, written as four octets.'],
          ['How many usable hosts does a /26 subnet provide?', ['64', '62', '30', '126'], 1, 'A /26 leaves 6 host bits: 2^6 - 2 = 62.'],
          ['Which subnet mask is equivalent to /24?', ['255.0.0.0', '255.255.0.0', '255.255.255.0', '255.255.255.192'], 2, '24 network bits fill the first three octets.'],
          ['Which of these is a private IPv4 address?', ['8.8.8.8', '192.168.1.10', '172.32.0.1', '203.0.113.5'], 1, '192.168.0.0/16 is an RFC 1918 private range.'],
          ['How many bits are in an IPv6 address?', ['32', '64', '96', '128'], 3, 'IPv6 addresses are 128 bits long.'],
        ],
      },
      {
        title: 'Module 3: Core Protocols and Services',
        summary: 'TCP versus UDP, well known ports, DNS, and DHCP.',
        textContent: `### 3.1 TCP vs UDP
- **TCP (Transmission Control Protocol)** is **connection-oriented**. It establishes a session with a **three-way handshake** (SYN, SYN-ACK, ACK), guarantees ordered delivery, and retransmits lost segments. Used by web browsing and email.
- **UDP (User Datagram Protocol)** is **connectionless**. It has lower overhead but no delivery guarantee. Used by video streaming, online games, VoIP, and DNS queries.

### 3.2 Well Known Ports
- **HTTP**: 80
- **HTTPS**: 443
- **SSH**: 22
- **DNS**: 53
- **SMTP**: 25

### 3.3 DNS
The **Domain Name System** translates human readable names such as \`quikz.edu\` into IP addresses. Resolution typically flows from the local resolver to root servers, then TLD servers, and finally the authoritative name server.

### 3.4 DHCP
The **Dynamic Host Configuration Protocol** automatically assigns IP addresses, subnet masks, default gateways, and DNS servers to devices. The process follows **DORA**: Discover, Offer, Request, Acknowledge.`,
        quiz: [
          ['Which protocol uses a three-way handshake to establish a connection?', ['UDP', 'TCP', 'ICMP', 'ARP'], 1, 'TCP opens sessions with SYN, SYN-ACK, ACK.'],
          ['What is the default port for HTTPS?', ['80', '22', '443', '53'], 2, 'HTTPS listens on port 443.'],
          ['Which service translates domain names into IP addresses?', ['DHCP', 'DNS', 'FTP', 'SMTP'], 1, 'DNS resolves names to addresses.'],
          ['What does the DHCP DORA process stand for?', ['Discover, Offer, Request, Acknowledge', 'Detect, Open, Route, Accept', 'Deliver, Obtain, Reply, Assign', 'Domain, Origin, Resolve, Address'], 0, 'Clients Discover, servers Offer, clients Request, servers Acknowledge.'],
          ['Which transport protocol is best suited for live video streaming?', ['TCP', 'UDP', 'SMTP', 'FTP'], 1, 'UDP has low overhead and tolerates occasional loss.'],
        ],
      },
    ],
  },
  {
    name: 'Web Systems and Technologies',
    code: 'IT203',
    term: '2nd Semester',
    yearLevel: '2nd Year',
    description: 'Building for the web with HTML, CSS, JavaScript, and the HTTP request-response model.',
    modules: [
      {
        title: 'Module 1: HTML Structure and Semantics',
        summary: 'Document structure, common elements, semantic tags, and accessible markup.',
        textContent: `### 1.1 What Is HTML?
**HTML (HyperText Markup Language)** describes the structure and meaning of web content using **elements** written as tags.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Quikz</title>
  </head>
  <body>
    <h1>Welcome to Quikz</h1>
    <p>Learn one module at a time.</p>
    <a href="/subjects">Browse subjects</a>
  </body>
</html>
\`\`\`

### 1.2 Head vs Body
- The **head** holds metadata: title, character set, stylesheets.
- The **body** holds the visible content.

### 1.3 Semantic Elements
Semantic tags describe the **meaning** of content, which helps accessibility and search engines: \`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\`, \`<footer>\`.

### 1.4 Accessibility Basics
- Give every image an **alt** attribute describing it.
- Associate each form input with a \`<label>\`.
- Use headings in order (\`h1\` then \`h2\`) to create a logical outline.`,
        quiz: [
          ['What does HTML stand for?', ['HyperText Markup Language', 'High Transfer Machine Language', 'Hyperlink Text Management Logic', 'Home Tool Markup Language'], 0, 'HTML is the HyperText Markup Language.'],
          ['Which tag creates a hyperlink?', ['<link>', '<a>', '<href>', '<nav>'], 1, 'The anchor element <a> with an href attribute creates a link.'],
          ['Which attribute provides a text description of an image for screen readers?', ['title', 'src', 'alt', 'name'], 2, 'The alt attribute describes images for assistive technology.'],
          ['Which of these is a semantic HTML element?', ['<div>', '<span>', '<article>', '<b>'], 2, '<article> describes a self-contained piece of content.'],
          ['Where does the <title> element belong?', ['Inside <body>', 'Inside <head>', 'Inside <footer>', 'Before <!DOCTYPE>'], 1, 'The title is metadata, so it goes in the head.'],
        ],
      },
      {
        title: 'Module 2: CSS Styling and Layout',
        summary: 'Selectors, the box model, specificity, Flexbox, and responsive design.',
        textContent: `### 2.1 CSS Syntax
**CSS (Cascading Style Sheets)** controls presentation. A rule has a **selector** and a **declaration block**:

\`\`\`css
.card {
  padding: 16px;
  border: 1px solid #ccc;
}
\`\`\`

### 2.2 Selectors and Specificity
- Element selector: \`p\`
- Class selector: \`.card\`
- ID selector: \`#header\`

When rules conflict, the more **specific** selector wins: ID beats class, and class beats element.

### 2.3 The Box Model
Every element is a box made of, from inside out: **content**, **padding**, **border**, and **margin**. Setting \`box-sizing: border-box\` makes width include padding and border.

### 2.4 Flexbox
Flexbox lays items out in one dimension:

\`\`\`css
.toolbar {
  display: flex;
  justify-content: space-between; /* main axis */
  align-items: center;            /* cross axis */
}
\`\`\`

### 2.5 Responsive Design
**Media queries** apply styles based on screen size, letting one page adapt from phones to desktops:

\`\`\`css
@media (max-width: 600px) {
  .toolbar { flex-direction: column; }
}
\`\`\``,
        quiz: [
          ['Which selector targets elements with class="card"?', ['#card', '.card', 'card', '*card'], 1, 'Class selectors start with a dot.'],
          ['Which selector has the highest specificity?', ['Element selector', 'Class selector', 'ID selector', 'Universal selector'], 2, 'ID selectors outrank class and element selectors.'],
          ['In the box model, which layer sits between padding and margin?', ['Content', 'Border', 'Outline', 'Shadow'], 1, 'The order is content, padding, border, margin.'],
          ['Which property aligns flex items along the main axis?', ['align-items', 'justify-content', 'flex-wrap', 'text-align'], 1, 'justify-content distributes items along the main axis.'],
          ['Which CSS feature applies styles based on screen width?', ['Pseudo-classes', 'Media queries', 'Variables', 'Keyframes'], 1, 'Media queries enable responsive layouts.'],
        ],
      },
      {
        title: 'Module 3: JavaScript and the HTTP Request-Response Cycle',
        summary: 'Adding interactivity with JavaScript and the DOM, and how browsers talk to servers over HTTP.',
        textContent: `### 3.1 JavaScript and the DOM
**JavaScript** makes pages interactive. The browser exposes the page as the **DOM (Document Object Model)**, a tree of objects that scripts can read and change:

\`\`\`javascript
const button = document.querySelector('#start');
button.addEventListener('click', () => {
  document.querySelector('#status').textContent = 'Quiz started!';
});
\`\`\`

### 3.2 Declaring Variables
- \`const\` declares a binding that cannot be reassigned.
- \`let\` declares a block scoped variable that can be reassigned.
- \`var\` is the older function scoped form and is best avoided.

### 3.3 HTTP Methods
- **GET**: retrieve a resource.
- **POST**: create a resource or submit data.
- **PUT / PATCH**: replace or update a resource.
- **DELETE**: remove a resource.

### 3.4 Status Codes
- **2xx Success**: \`200 OK\`, \`201 Created\`.
- **3xx Redirection**: \`301 Moved Permanently\`.
- **4xx Client Error**: \`400 Bad Request\`, \`401 Unauthorized\`, \`404 Not Found\`.
- **5xx Server Error**: \`500 Internal Server Error\`.

### 3.5 Fetching Data
\`\`\`javascript
const res = await fetch('/api/subjects');
const data = await res.json();
\`\`\``,
        quiz: [
          ['What does DOM stand for?', ['Document Object Model', 'Data Output Module', 'Dynamic Object Method', 'Display Order Map'], 0, 'The DOM is the Document Object Model.'],
          ['Which keyword declares a variable that cannot be reassigned?', ['var', 'let', 'const', 'static'], 2, 'const bindings cannot be reassigned.'],
          ['Which HTTP method is normally used to retrieve a resource?', ['POST', 'GET', 'DELETE', 'PATCH'], 1, 'GET requests read data without changing it.'],
          ['What does HTTP status code 404 mean?', ['Server error', 'Created', 'Not Found', 'Unauthorized'], 2, '404 means the requested resource does not exist.'],
          ['Which status code class indicates a server error?', ['2xx', '3xx', '4xx', '5xx'], 3, '5xx codes signal a failure on the server side.'],
        ],
      },
    ],
  },
  {
    name: 'Information Assurance and Security',
    code: 'IT301',
    term: '1st Semester',
    yearLevel: '3rd Year',
    description: 'Security principles, common threats and attacks, cryptography, and defensive controls for information systems.',
    modules: [
      {
        title: 'Module 1: Security Principles and the CIA Triad',
        summary: 'Confidentiality, integrity, availability, authentication, and the principle of least privilege.',
        textContent: `### 1.1 The CIA Triad
Information security protects three core properties:
- **Confidentiality**: only authorized people can read the data. Controls include encryption and access control.
- **Integrity**: data is accurate and has not been altered without authorization. Controls include hashing and digital signatures.
- **Availability**: systems and data are accessible when needed. Controls include backups, redundancy, and DDoS protection.

### 1.2 Authentication, Authorization, Accounting (AAA)
- **Authentication** verifies who you are.
- **Authorization** determines what you are allowed to do.
- **Accounting** records what you did, for auditing.

### 1.3 Authentication Factors
- Something you **know**: password or PIN.
- Something you **have**: phone or security key.
- Something you **are**: fingerprint or face.

**Multi-factor authentication (MFA)** combines two or more different factor types.

### 1.4 Least Privilege and Defense in Depth
- **Least privilege**: give users only the access they need to do their job.
- **Defense in depth**: layer multiple controls so that one failure does not expose the whole system.`,
        quiz: [
          ['Which CIA principle ensures only authorized people can read data?', ['Integrity', 'Availability', 'Confidentiality', 'Accounting'], 2, 'Confidentiality prevents unauthorized disclosure.'],
          ['Regular backups and redundant servers mainly support which principle?', ['Confidentiality', 'Availability', 'Integrity', 'Non-repudiation'], 1, 'Backups and redundancy keep systems available.'],
          ['Which process determines what an authenticated user is allowed to do?', ['Authentication', 'Authorization', 'Accounting', 'Encryption'], 1, 'Authorization grants permissions after identity is verified.'],
          ['A password combined with a code from a phone app is an example of:', ['Single sign-on', 'Multi-factor authentication', 'Least privilege', 'Hashing'], 1, 'It combines something you know with something you have.'],
          ['Giving users only the access needed for their job follows which principle?', ['Defense in depth', 'Least privilege', 'Separation of networks', 'Open design'], 1, 'Least privilege limits the damage from misuse or compromise.'],
        ],
      },
      {
        title: 'Module 2: Threats, Vulnerabilities, and Common Attacks',
        summary: 'Malware, social engineering, and web application attacks such as SQL injection and XSS.',
        textContent: `### 2.1 Key Terms
- **Threat**: a potential cause of harm, such as an attacker or a flood.
- **Vulnerability**: a weakness that can be exploited, such as unpatched software.
- **Risk**: the likelihood that a threat exploits a vulnerability, combined with its impact.

### 2.2 Malware
- **Virus**: attaches to files and spreads when they run.
- **Worm**: spreads across networks on its own without user action.
- **Trojan**: disguises itself as legitimate software.
- **Ransomware**: encrypts victim files and demands payment.

### 2.3 Social Engineering
**Phishing** tricks people into revealing credentials or clicking malicious links, usually by email. **Spear phishing** targets a specific person using personal details. The best defenses are awareness training and verifying requests through a separate channel.

### 2.4 Web Application Attacks
- **SQL Injection**: untrusted input is concatenated into a SQL query, letting an attacker change the query. Prevent it with **parameterized queries** (prepared statements).
- **Cross-Site Scripting (XSS)**: an attacker injects scripts that run in other users' browsers. Prevent it with **output encoding** and input validation.
- **Denial of Service (DoS)**: overwhelms a service so legitimate users cannot reach it; a distributed version is a **DDoS**.`,
        quiz: [
          ['Which malware spreads across networks without any user action?', ['Virus', 'Worm', 'Trojan', 'Adware'], 1, 'Worms self-propagate across networks.'],
          ['Malware that encrypts files and demands payment is called:', ['Spyware', 'Rootkit', 'Ransomware', 'Keylogger'], 2, 'Ransomware holds data hostage for payment.'],
          ['What is the most effective defense against SQL injection?', ['Longer passwords', 'Parameterized queries', 'Disabling cookies', 'Using HTTP instead of HTTPS'], 1, 'Parameterized queries keep input separate from SQL code.'],
          ['A fraudulent email that tricks users into revealing passwords is an example of:', ['Phishing', 'DDoS', 'Brute force', 'Port scanning'], 0, 'Phishing is a social engineering attack.'],
          ['A weakness that can be exploited, such as unpatched software, is a:', ['Threat', 'Vulnerability', 'Risk', 'Control'], 1, 'Vulnerabilities are weaknesses; threats are what exploit them.'],
        ],
      },
      {
        title: 'Module 3: Cryptography and Security Controls',
        summary: 'Symmetric and asymmetric encryption, hashing, digital certificates, and protective controls.',
        textContent: `### 3.1 Symmetric Encryption
**Symmetric encryption** uses the **same key** to encrypt and decrypt. It is fast and suited to bulk data. Example: **AES**. The challenge is sharing the key securely.

### 3.2 Asymmetric Encryption
**Asymmetric (public key) encryption** uses a **key pair**:
- Data encrypted with the **public key** can only be decrypted with the matching **private key**.
- A message signed with the **private key** can be verified by anyone holding the public key, creating a **digital signature**.

Example: **RSA**. HTTPS uses asymmetric cryptography to exchange a symmetric session key, then switches to fast symmetric encryption.

### 3.3 Hashing
A **hash function** produces a fixed length digest from any input and is **one-way**. It verifies integrity: any change to the input produces a different hash. Example: **SHA-256**. Passwords should be stored with slow, salted algorithms such as **bcrypt**, never in plain text.

### 3.4 Digital Certificates
A **digital certificate** binds a public key to an identity and is signed by a trusted **Certificate Authority (CA)**. Browsers check certificates to confirm they are talking to the real website.

### 3.5 Security Controls
- **Preventive**: firewalls, access control, encryption.
- **Detective**: intrusion detection systems (IDS), log monitoring.
- **Corrective**: backups, patching, incident response.`,
        quiz: [
          ['Which encryption type uses the same key to encrypt and decrypt?', ['Asymmetric', 'Symmetric', 'Hashing', 'Steganography'], 1, 'Symmetric algorithms such as AES share a single key.'],
          ['In asymmetric encryption, data encrypted with a public key is decrypted with the:', ['Same public key', 'Matching private key', 'Session cookie', 'Hash value'], 1, 'Only the paired private key can decrypt it.'],
          ['Which property makes hashing suitable for verifying integrity?', ['It is reversible', 'Any change in input changes the output', 'It requires two keys', 'It compresses files losslessly'], 1, 'Even a one-character change produces a different digest.'],
          ['Who signs a website digital certificate?', ['The web browser', 'A Certificate Authority', 'The DNS server', 'The end user'], 1, 'Trusted Certificate Authorities sign certificates.'],
          ['An intrusion detection system is an example of which type of control?', ['Preventive', 'Corrective', 'Detective', 'Deterrent'], 2, 'An IDS detects and alerts on suspicious activity.'],
        ],
      },
    ],
  },
];

const toQuestions = (quiz: SeedQuestion[]): IQuestion[] =>
  quiz.map(([questionText, options, correctIndex, explanation]) => ({ questionText, options, correctIndex, explanation }));

/**
 * Seeds the IT demo catalog once. If any catalog subject already exists the whole
 * catalog is skipped, so restarts never resurrect subjects a faculty member deleted.
 */
export async function seedItCurriculum(faculty: { _id: unknown; fullName: string }) {
  const codes = IT_CURRICULUM.map((s) => s.code);
  if (await Subject.exists({ code: { $in: codes } })) return;

  console.log(`Seeding IT demo catalog (${codes.join(', ')})...`);
  for (const seed of IT_CURRICULUM) {
    const subject = await Subject.create({
      name: seed.name,
      code: seed.code,
      term: seed.term,
      yearLevel: seed.yearLevel,
      description: seed.description,
      facultyId: faculty._id,
      facultyName: faculty.fullName,
    });
    for (const [index, mod] of seed.modules.entries()) {
      const module = await Module.create({
        subjectId: subject._id,
        createdBy: faculty._id,
        title: mod.title,
        orderIndex: index + 1,
        summary: mod.summary,
        contentType: 'text',
        textContent: mod.textContent,
      });
      const quiz = await Quiz.create({
        title: `${mod.title} - End Quiz`,
        subjectId: subject._id,
        moduleId: module._id,
        createdBy: faculty._id,
        timeLimitMinutes: 15,
        passingPercentage: 75,
        questions: toQuestions(mod.quiz),
      });
      module.quizId = quiz._id as any;
      await module.save();
    }
  }
  console.log(`Seeded ${IT_CURRICULUM.length} IT subjects with modules and end quizzes.`);
}
