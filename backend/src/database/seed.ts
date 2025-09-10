import bcrypt from 'bcryptjs';
import { query, initializeDatabase } from './index';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Ensure database is initialized
    await initializeDatabase();

    // 1. Create users
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const professorPasswordHash = await bcrypt.hash('prof123', 12);
    const studentPasswordHash = await bcrypt.hash('student123', 12);

    // Insert users
    await query(`
      INSERT INTO users (email, password_hash, role, name, student_id, department)
      VALUES 
        ('admin@cityu.edu.hk', $1, 'admin', 'System Administrator', NULL, 'IT Department'),
        ('prof.zhang@cityu.edu.hk', $2, 'professor', 'Prof. Zhang Wei', NULL, 'Computer Science'),
        ('prof.li@cityu.edu.hk', $2, 'professor', 'Prof. Li Jing', NULL, 'Computer Science'),
        ('student1@my.cityu.edu.hk', $3, 'student', 'Wang Xiaoming', '12345678', 'Computer Science'),
        ('student2@my.cityu.edu.hk', $3, 'student', 'Li Xiaohua', '12345679', 'Computer Science'),
        ('student3@my.cityu.edu.hk', $3, 'student', 'Chen Xiaomei', '12345680', 'Electronic Engineering')
      ON CONFLICT (email) DO NOTHING
    `, [adminPasswordHash, professorPasswordHash, studentPasswordHash]);

    console.log('✅ Users created');

    // 2. Create courses
    await query(`
      INSERT INTO courses (title, description, code, professor_id, department, semester, credits)
      SELECT 
        'Introduction to Algorithms', 
        'Covers fundamental concepts and techniques in algorithm design and analysis.',
        'CS101',
        u.id,
        'Computer Science',
        '2025-Fall',
        3
      FROM users u WHERE u.email = 'prof.zhang@cityu.edu.hk'
      UNION ALL
      SELECT 
        'Data Structures', 
        'An in-depth study of data structures such as arrays, linked lists, trees, and graphs.',
        'CS102',
        u.id,
        'Computer Science',
        '2025-Fall',
        3
      FROM users u WHERE u.email = 'prof.li@cityu.edu.hk'
      ON CONFLICT (code) DO NOTHING
    `);

    console.log('✅ Courses created');

    // 3. Create lectures
    const cs101Course = await query("SELECT id FROM courses WHERE code = 'CS101'");
    const cs102Course = await query("SELECT id FROM courses WHERE code = 'CS102'");

    if (cs101Course.rows[0]) {
      await query(`
        INSERT INTO lectures (course_id, title, description, scheduled_at, duration_minutes, room_location, status, is_recorded)
        VALUES 
          ($1, 'Lecture 1: Algorithm Basics', 'Introduction to fundamental concepts and analysis of algorithms.', NOW() + INTERVAL '1 hour', 90, 'Lecture Hall A', 'scheduled', true),
          ($1, 'Lecture 2: Sorting Algorithms', 'A deep dive into various sorting algorithms and their comparisons.', NOW() + INTERVAL '2 hours', 90, 'Lecture Hall A', 'scheduled', true)
        ON CONFLICT DO NOTHING
      `, [cs101Course.rows[0].id]);
    }

    if (cs102Course.rows[0]) {
      await query(`
        INSERT INTO lectures (course_id, title, description, scheduled_at, duration_minutes, room_location, status, is_recorded)
        VALUES 
          ($1, 'Lecture 1: Arrays and Linked Lists', 'Learning the design and operations of basic data structures.', NOW() + INTERVAL '3 hours', 90, 'Lecture Hall B', 'scheduled', true)
        ON CONFLICT DO NOTHING
      `, [cs102Course.rows[0].id]);
    }

    console.log('✅ Lectures created');

    // 4. Create academic terms
    await query(`
      INSERT INTO academic_terms (term, explanation, category, language, difficulty_level)
      VALUES 
        ('Algorithm', 'An algorithm is a set of well-defined steps for solving a problem.', 'Computer Science', 'en', 'intermediate'),
        ('Data Structure', 'A data structure is a way of organizing and storing data in order to access and modify it efficiently.', 'Computer Science', 'en', 'intermediate'),
        ('Complexity', 'Complexity is a measure of an algorithm''s efficiency, including time complexity and space complexity.', 'Computer Science', 'en', 'advanced'),
        ('Sorting', 'Sorting is the process of rearranging a set of data into a specific order.', 'Computer Science', 'en', 'beginner'),
        ('Binary Search', 'Binary search is an efficient search algorithm for finding a specific element in a sorted array.', 'Computer Science', 'en', 'intermediate'),
        ('Recursion', 'Recursion is a programming technique where a function calls itself directly or indirectly.', 'Computer Science', 'en', 'advanced'),
        ('Hash Table', 'A hash table is a data structure based on a hash function that provides fast insertion, deletion, and lookup operations.', 'Computer Science', 'en', 'intermediate'),
        ('Graph', 'A graph is a mathematical structure consisting of nodes and edges used to represent relationships between objects.', 'Computer Science', 'en', 'advanced')
      ON CONFLICT (term) DO NOTHING
    `);

    console.log('✅ Academic terms created');

    // 5. Create course enrollments
    await query(`
      INSERT INTO course_enrollments (course_id, student_id, status)
      SELECT c.id, s.id, 'active'
      FROM courses c
      CROSS JOIN users s
      WHERE c.code IN ('CS101', 'CS102') 
        AND s.role = 'student'
      ON CONFLICT (course_id, student_id) DO NOTHING
    `);

    console.log('✅ Course enrollments created');

    console.log('🎉 Database seeded!');
    console.log('');
    console.log('📋 Test accounts:');
    console.log('  Admin: admin@cityu.edu.hk / admin123');
    console.log('  Professor 1: prof.zhang@cityu.edu.hk / prof123');
    console.log('  Professor 2: prof.li@cityu.edu.hk / prof123');
    console.log('  Student 1: student1@my.cityu.edu.hk / student123');
    console.log('  Student 2: student2@my.cityu.edu.hk / student123');
    console.log('  Student 3: student3@my.cityu.edu.hk / student123');
    console.log('');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// 直接執行時運行
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seed 完成，可以開始使用系統！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed 失敗:', error);
      process.exit(1);
    });
}

export { seedDatabase };
