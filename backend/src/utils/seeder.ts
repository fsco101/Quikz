import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Subject } from '../models/Subject.js';
import { Module } from '../models/Module.js';

export const seedDatabase = async () => {
  try {
    const facultyCount = await User.countDocuments({ role: 'faculty' });
    const studentCount = await User.countDocuments({ role: 'student' });

    let facultyUser = null;

    if (facultyCount === 0) {
      console.log('Seeding default Faculty demo account...');
      const facultyPasswordHash = await bcrypt.hash('Faculty@123', 10);
      facultyUser = await User.create({
        username: 'prof_alvarez',
        email: 'faculty@quikz.edu',
        passwordHash: facultyPasswordHash,
        role: 'faculty',
        fullName: 'Prof. Marcus Alvarez',
        surname: 'Alvarez',
        termsAccepted: true,
        termsAcceptedAt: new Date()
      });
      console.log('Seeded Faculty: faculty@quikz.edu / Faculty@123');
    } else {
      facultyUser = await User.findOne({ role: 'faculty' });
    }

    if (studentCount === 0) {
      console.log('Seeding default Student demo account...');
      const studentPasswordHash = await bcrypt.hash('Student@123', 10);
      await User.create({
        username: 'alex_delacruz',
        email: 'student@quikz.edu',
        passwordHash: studentPasswordHash,
        role: 'student',
        fullName: 'Alex Dela Cruz',
        surname: 'Dela Cruz',
        yearLevel: '3rd Year',
        section: 'Section A',
        termsAccepted: true,
        termsAcceptedAt: new Date()
      });
      console.log('Seeded Student: student@quikz.edu / Student@123');
    }

    // Seed Demo Subject and Modules if none exist
    const subjectCount = await Subject.countDocuments();
    if (subjectCount === 0 && facultyUser) {
      console.log('Seeding Demo Subject (CS101)...');
      const cs101 = await Subject.create({
        name: 'Introduction to Cognitive Computer Science',
        code: 'CS101',
        term: '1st Semester',
        yearLevel: '3rd Year',
        facultyId: facultyUser._id,
        facultyName: facultyUser.fullName,
        description: 'Comprehensive study of cognitive algorithms, memory hierarchy, and distributed systems.'
      });

      console.log('Seeding Sequential Modules for CS101...');
      await Module.create([
        {
          subjectId: cs101._id,
          title: 'Module 1: Foundations of Cognitive Algorithms & Information Retrieval',
          orderIndex: 1,
          summary: 'Overview of computational complexity, Big-O notations, data structures, and heuristic retrieval methods.',
          contentType: 'text',
          textContent: `### 1.1 Computational Complexity and Big-O Notation
Algorithm analysis allows software engineers to quantify time and space requirements independently of hardware architecture.

- **O(1) Constant Time**: Execution time remains invariant regardless of input size $N$. Example: Hash table lookups under uniform hashing.
- **O(log N) Logarithmic**: Search spaces halving each step, e.g., binary search on sorted sequences.
- **O(N) Linear Time**: Directly proportional processing over collections.
- **O(N log N) Linearithmic**: Optimal comparison sorting (Merge Sort, TimSort, QuickSort average case).

### 1.2 Information Retrieval Architecture
Retrieval engines leverage inverted indexes mapping terms to document postings lists with TF-IDF and BM25 relevance weighting.`
        },
        {
          subjectId: cs101._id,
          title: 'Module 2: Memory Architecture & Pointer Dynamics',
          orderIndex: 2,
          summary: 'Deep dive into virtual memory, stack frame conventions, heap allocation mechanisms, and cache locality.',
          contentType: 'text',
          textContent: `### 2.1 The Memory Hierarchy
Modern computational systems rely on hierarchical caching layers to bridge the performance gap between CPU cycle times and DRAM latency:

1. **L1 / L2 Cache**: Sub-nanosecond to 3ns access latency, physically close to arithmetic logic units.
2. **L3 Unified Cache**: 10-20ns latency shared across processor cores.
3. **Main Memory (DRAM)**: 50-100ns latency with page fault overheads.
4. **Non-Volatile Storage (NVMe/SSD)**: Block-level access governed by OS page tables.

### 2.2 Stack vs Heap Dynamics
- **Stack**: Contiguous LIFO allocation, zero fragmentation, automated deallocation via stack pointer manipulation.
- **Heap**: Dynamic runtime sizing, non-contiguous allocations, managed via free-lists or garbage collectors.`
        },
        {
          subjectId: cs101._id,
          title: 'Module 3: Network Topology & Gated Distributed Systems',
          orderIndex: 3,
          summary: 'Protocols for consensus, network partitioning resilience under CAP theorem, and low-latency packet routing.',
          contentType: 'text',
          textContent: `### 3.1 CAP Theorem and Distributed State
Distributed data stores face fundamental trade-offs:
- **Consistency**: All nodes perceive identical data at the same timestamp.
- **Availability**: Every non-failing node returns a non-error response.
- **Partition Tolerance**: The system continues operating despite dropped or delayed packet transmissions across network boundaries.

Under network partitions, a distributed system must choose between CP (consistent partition) or AP (available partition).`
        }
      ]);

      console.log('Seeded CS101 with 3 sequential modules successfully!');
    }
  } catch (err: any) {
    console.error('Error seeding demo curriculum:', err.message);
  }
};
