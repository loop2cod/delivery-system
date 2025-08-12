#!/usr/bin/env tsx

import * as readline from 'readline';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database';
import { User, UserRole, UserStatus } from '../models/User';
import { logger } from '../utils/logger';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const hiddenQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    process.stdout.write(query);
    
    let password = '';
    const onData = (data: Buffer) => {
      const char = data.toString();
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };
    
    stdin.on('data', onData);
  });
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
  }
  
  return { valid: true };
};

async function createSuperAdmin() {
  try {
    console.log('\n🚀 Super Admin Creation Script');
    console.log('================================\n');

    // Connect to database
    await connectDatabase();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: UserRole.ADMIN });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`👤 Name: ${existingAdmin.name}`);
      console.log(`📅 Created: ${existingAdmin.created_at}\n`);
      
      const overwrite = await question('Do you want to create another admin user? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('✅ Keeping existing admin user.');
        process.exit(0);
      }
    }

    // Get admin details
    let email: string;
    let name: string;
    let phone: string;
    let password: string;
    let confirmPassword: string;

    // Email validation loop
    do {
      email = await question('📧 Enter admin email: ');
      if (!validateEmail(email)) {
        console.log('❌ Please enter a valid email address.');
      } else {
        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          console.log('❌ Email already exists. Please use a different email.');
          email = '';
        }
      }
    } while (!email || !validateEmail(email));

    // Name input
    do {
      name = await question('👤 Enter admin full name: ');
      if (!name.trim()) {
        console.log('❌ Name cannot be empty.');
      }
    } while (!name.trim());

    // Phone input (optional)
    phone = await question('📱 Enter admin phone (optional): ');

    // Password validation loop
    do {
      password = await hiddenQuestion('🔒 Enter admin password: ');
      const passwordValidation = validatePassword(password);
      
      if (!passwordValidation.valid) {
        console.log(`❌ ${passwordValidation.message}`);
        continue;
      }

      confirmPassword = await hiddenQuestion('🔒 Confirm admin password: ');
      
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match. Please try again.');
        password = '';
      }
    } while (!password);

    console.log('\n📝 Creating super admin user...');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = new User({
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      name: name.trim(),
      phone: phone.trim() || undefined,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      email_verified: true, // Admin is pre-verified
      created_at: new Date(),
      updated_at: new Date()
    });

    await adminUser.save();

    console.log('\n✅ Super Admin created successfully!');
    console.log('================================');
    console.log(`📧 Email: ${adminUser.email}`);
    console.log(`👤 Name: ${adminUser.name}`);
    console.log(`📱 Phone: ${adminUser.phone || 'Not provided'}`);
    console.log(`🔑 Role: ${adminUser.role}`);
    console.log(`✅ Status: ${adminUser.status}`);
    console.log(`📅 Created: ${adminUser.created_at}`);
    console.log('\n🎉 Admin can now login to the system with these credentials.');
    
    // Log admin creation for audit
    logger.info('Super admin created', {
      adminId: adminUser._id,
      email: adminUser.email,
      name: adminUser.name,
      createdAt: adminUser.created_at
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('\n❌ Error creating super admin:', errorMessage);
    logger.error('Failed to create super admin', { error: errorMessage });
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Script terminated by user.');
  rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Script terminated.');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  createSuperAdmin();
}

export { createSuperAdmin };