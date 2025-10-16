import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create the required manager if it doesn't exist
  console.log('Checking for required manager...')
  let pmUser = await prisma.user.findUnique({
    where: { email: 'ttrescak@deloitte.es' },
    include: { person: true },
  })

  if (!pmUser) {
    console.log('Creating required manager: ttrescak@deloitte.es')
    pmUser = await prisma.user.create({
      data: {
        name: 'Tomas Trescak',
        email: 'ttrescak@deloitte.es',
        passwordHash: await bcrypt.hash('deloitte123', 12),
        role: 'PROJECT_MANAGER',
        person: {
          create: {
            name: 'Tomas Trescak',
            email: 'ttrescak@deloitte.es',
            role: 'PROJECT_MANAGER',
          },
        },
      },
      include: { person: true },
    })
    console.log('✅ Manager created successfully')
  } else {
    console.log('✅ Manager already exists, skipping creation')
  }

  // // Check if we need to seed demo data
  // const existingUsers = await prisma.user.count()
  // if (existingUsers > 1) {
  //   console.log('Demo data already exists, skipping seed')
  //   return
  // }

  // console.log('Creating demo data...')
  
  // // Create additional demo users
  // console.log('Creating demo users...')

  // const user1 = await prisma.user.create({
  //   data: {
  //     name: 'Bob Smith',
  //     email: 'bob@example.com',
  //     passwordHash: await bcrypt.hash('password123', 12),
  //     role: 'USER',
  //     person: {
  //       create: {
  //         name: 'Bob Smith',
  //         email: 'bob@example.com',
  //         role: 'USER',
  //       },
  //     },
  //   },
  //   include: { person: true },
  // })

  // const user2 = await prisma.user.create({
  //   data: {
  //     name: 'Carol Davis',
  //     email: 'carol@example.com',
  //     passwordHash: await bcrypt.hash('password123', 12),
  //     role: 'USER',
  //     person: {
  //       create: {
  //         name: 'Carol Davis',
  //         email: 'carol@example.com',
  //         role: 'USER',
  //       },
  //     },
  //   },
  //   include: { person: true },
  // })

  // // Create competencies
  // console.log('Creating competencies...')
  // const competencies = await Promise.all([
  //   // Knowledge
  //   prisma.competency.create({
  //     data: {
  //       type: 'KNOWLEDGE',
  //       name: 'Software Architecture',
  //       description: 'Understanding of software design patterns and architectural principles',
  //     },
  //   }),
  //   prisma.competency.create({
  //     data: {
  //       type: 'KNOWLEDGE',
  //       name: 'Database Design',
  //       description: 'Knowledge of relational and NoSQL database design principles',
  //     },
  //   }),
    
  //   // Skills
  //   prisma.competency.create({
  //     data: {
  //       type: 'SKILL',
  //       name: 'TypeScript Programming',
  //       description: 'Proficiency in TypeScript language and ecosystem',
  //     },
  //   }),
  //   prisma.competency.create({
  //     data: {
  //       type: 'SKILL',
  //       name: 'Project Management',
  //       description: 'Ability to plan, execute, and deliver projects successfully',
  //     },
  //   }),
    
  //   // Tech Tools
  //   prisma.competency.create({
  //     data: {
  //       type: 'TECH_TOOL',
  //       name: 'React',
  //       description: 'Frontend framework for building user interfaces',
  //     },
  //   }),
  //   prisma.competency.create({
  //     data: {
  //       type: 'TECH_TOOL',
  //       name: 'Docker',
  //       description: 'Containerization platform for application deployment',
  //     },
  //   }),
    
  //   // Abilities
  //   prisma.competency.create({
  //     data: {
  //       type: 'ABILITY',
  //       name: 'Problem Solving',
  //       description: 'Analytical thinking and systematic approach to solving complex problems',
  //     },
  //   }),
  //   prisma.competency.create({
  //     data: {
  //       type: 'ABILITY',
  //       name: 'Communication',
  //       description: 'Effective verbal and written communication skills',
  //     },
  //   }),
    
  //   // Values
  //   prisma.competency.create({
  //     data: {
  //       type: 'VALUE',
  //       name: 'Continuous Learning',
  //       description: 'Commitment to ongoing professional development',
  //     },
  //   }),
    
  //   // Behaviors
  //   prisma.competency.create({
  //     data: {
  //       type: 'BEHAVIOUR',
  //       name: 'Collaboration',
  //       description: 'Working effectively with team members and stakeholders',
  //     },
  //   }),
    
  //   // Enablers
  //   prisma.competency.create({
  //     data: {
  //       type: 'ENABLER',
  //       name: 'Mentoring',
  //       description: 'Supporting and developing junior team members',
  //     },
  //   }),
  // ])

  // // Assign competencies to users
  // console.log('Assigning competencies to users...')
  // const skillAndAbilityCompetencies = competencies.filter(c => 
  //   ['SKILL', 'TECH_TOOL', 'ABILITY'].includes(c.type)
  // )

  // for (const person of [user1.person!, user2.person!]) {
  //   for (const competency of skillAndAbilityCompetencies) {
  //     const proficiencyLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const
  //     const randomProficiency = proficiencyLevels[Math.floor(Math.random() * proficiencyLevels.length)]
      
  //     await prisma.personCompetency.create({
  //       data: {
  //         personId: person.id,
  //         competencyId: competency.id,
  //         proficiency: randomProficiency,
  //       },
  //     })
  //   }
  // }

  // // Create courses
  // console.log('Creating courses...')
  // const course1 = await prisma.course.create({
  //   data: {
  //     name: 'Advanced TypeScript Development',
  //     description: 'Learn advanced TypeScript patterns, generics, and best practices for large-scale applications.',
  //     content: 'Module 1: Advanced Types\nModule 2: Generics and Utility Types\nModule 3: Decorators and Metadata\nModule 4: Performance Optimization',
  //     duration: 40,
  //     maxEnrollments: 20,
  //     status: 'PUBLISHED',
  //   },
  // })

  // const course2 = await prisma.course.create({
  //   data: {
  //     name: 'Leadership and Management Skills',
  //     description: 'Develop leadership capabilities and learn effective team management strategies.',
  //     content: 'Module 1: Leadership Fundamentals\nModule 2: Team Building\nModule 3: Communication Skills\nModule 4: Performance Management',
  //     duration: 30,
  //     maxEnrollments: 15,
  //     status: 'PUBLISHED',
  //   },
  // })

  // const course3 = await prisma.course.create({
  //   data: {
  //     name: 'Introduction to React Hooks',
  //     description: 'Master React Hooks for modern functional component development.',
  //     content: 'Module 1: useState and useEffect\nModule 2: Custom Hooks\nModule 3: Context and Reducers\nModule 4: Performance Hooks',
  //     duration: 25,
  //     status: 'DRAFT',
  //   },
  // })

  // // Link competencies to courses
  // await prisma.courseCompetency.create({
  //   data: {
  //     courseId: course1.id,
  //     competencyId: competencies.find(c => c.name === 'TypeScript Programming')!.id,
  //   },
  // })

  // await prisma.courseCompetency.create({
  //   data: {
  //     courseId: course2.id,
  //     competencyId: competencies.find(c => c.name === 'Project Management')!.id,
  //   },
  // })

  // await prisma.courseCompetency.create({
  //   data: {
  //     courseId: course2.id,
  //     competencyId: competencies.find(c => c.name === 'Communication')!.id,
  //   },
  // })

  // await prisma.courseCompetency.create({
  //   data: {
  //     courseId: course3.id,
  //     competencyId: competencies.find(c => c.name === 'React')!.id,
  //   },
  // })

  // // Create course enrollments
  // console.log('Creating course enrollments...')
  // await prisma.courseEnrollment.create({
  //   data: {
  //     courseId: course1.id,
  //     personId: user1.person!.id,
  //     progress: 65,
  //     completed: false,
  //   },
  // })

  // await prisma.courseEnrollment.create({
  //   data: {
  //     courseId: course2.id,
  //     personId: user2.person!.id,
  //     progress: 100,
  //     completed: true,
  //     completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
  //   },
  // })

  // await prisma.courseEnrollment.create({
  //   data: {
  //     courseId: course1.id,
  //     personId: user2.person!.id,
  //     progress: 30,
  //     completed: false,
  //   },
  // })

  // // Create projects
  // console.log('Creating projects...')
  // const project1 = await prisma.project.create({
  //   data: {
  //     name: 'HR Management System',
  //     description: 'Build a comprehensive HR and project management system with competency tracking.',
  //   },
  // })

  // const project2 = await prisma.project.create({
  //   data: {
  //     name: 'Mobile App Development',
  //     description: 'Develop a cross-platform mobile application for customer engagement.',
  //   },
  // })

  // // Create OKRs
  // await prisma.oKR.create({
  //   data: {
  //     projectId: project1.id,
  //     title: 'Complete MVP Development',
  //     description: 'Deliver minimum viable product with core features',
  //     metric: 'Feature completion',
  //     target: '100%',
  //     dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
  //   },
  // })

  // await prisma.oKR.create({
  //   data: {
  //     projectId: project1.id,
  //     title: 'User Acceptance Testing',
  //     description: 'Conduct comprehensive user testing and gather feedback',
  //     metric: 'Test scenarios passed',
  //     target: '95%',
  //     dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
  //   },
  // })

  // // Create project responsibilities
  // await prisma.projectResponsibility.create({
  //   data: {
  //     projectId: project1.id,
  //     personId: user1.person!.id,
  //     title: 'Frontend Development Lead',
  //     description: 'Lead frontend development using React and TypeScript',
  //   },
  // })

  // await prisma.projectResponsibility.create({
  //   data: {
  //     projectId: project1.id,
  //     personId: user2.person!.id,
  //     title: 'Backend Development',
  //     description: 'Develop backend APIs and database integration',
  //   },
  // })

  // // Create tasks
  // console.log('Creating tasks...')
  // const tasks = await Promise.all([
  //   prisma.task.create({
  //     data: {
  //       projectId: project1.id,
  //       title: 'Set up project structure',
  //       description: 'Initialize Next.js project with TypeScript and required dependencies',
  //       assigneeId: user1.person!.id,
  //       priority: 'HIGH',
  //       state: 'DONE',
  //     },
  //   }),
  //   prisma.task.create({
  //     data: {
  //       projectId: project1.id,
  //       title: 'Design database schema',
  //       description: 'Create Prisma schema with all required entities',
  //       assigneeId: user2.person!.id,
  //       priority: 'HIGH',
  //       state: 'DONE',
  //     },
  //   }),
  //   prisma.task.create({
  //     data: {
  //       projectId: project1.id,
  //       title: 'Implement authentication',
  //       description: 'Set up NextAuth with JWT and role-based access',
  //       assigneeId: user1.person!.id,
  //       priority: 'MEDIUM',
  //       state: 'IN_PROGRESS',
  //     },
  //   }),
  //   prisma.task.create({
  //     data: {
  //       projectId: project1.id,
  //       title: 'Build user management UI',
  //       description: 'Create pages for user profile and competency management',
  //       assigneeId: user1.person!.id,
  //       priority: 'MEDIUM',
  //       state: 'READY',
  //     },
  //   }),
  //   prisma.task.create({
  //     data: {
  //       projectId: project1.id,
  //       title: 'Implement project Kanban board',
  //       description: 'Build drag-and-drop Kanban interface for task management',
  //       priority: 'LOW',
  //       state: 'BACKLOG',
  //     },
  //   }),
  // ])

  // // Create assignments
  // console.log('Creating assignments...')
  // const currentWeekStart = new Date()
  // currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1) // Monday
  // currentWeekStart.setHours(0, 0, 0, 0)

  // const nextWeekStart = new Date(currentWeekStart)
  // nextWeekStart.setDate(nextWeekStart.getDate() + 7)

  // const assignment1 = await prisma.assignment.create({
  //   data: {
  //     personId: user1.person!.id,
  //     type: 'PROJECT',
  //     projectId: project1.id,
  //     startDate: currentWeekStart,
  //     plannedEndDate: new Date(currentWeekStart.getTime() + 5 * 24 * 60 * 60 * 1000), // Friday
  //     createdById: pmUser.id,
  //   },
  // })

  // const assignment2 = await prisma.assignment.create({
  //   data: {
  //     personId: user2.person!.id,
  //     type: 'COURSE',
  //     courseId: course1.id,
  //     startDate: nextWeekStart,
  //     plannedEndDate: new Date(nextWeekStart.getTime() + 5 * 24 * 60 * 60 * 1000), // Friday
  //     createdById: pmUser.id,
  //   },
  // })

  // // Create sample review
  // console.log('Creating sample reviews...')
  // await prisma.review.create({
  //   data: {
  //     assignmentId: assignment1.id,
  //     weekStartDate: currentWeekStart,
  //     status: 'IN_PROGRESS',
  //     reflection: 'Good progress on the authentication system. Facing some challenges with JWT implementation but making steady progress.',
  //     positives: ['Team collaboration', 'Technical learning', 'Problem solving'],
  //     negatives: ['Time estimation', 'Documentation'],
  //     submittedById: user1.person!.id,
  //       competencyDeltas: {
  //       create: [
  //         {
  //           competencyId: competencies.find(c => c.name === 'TypeScript Programming')!.id,
  //           newProficiency: 'ADVANCED',
  //         },
  //       ],
  //     },
  //   },
  // })

  // // Create change logs for audit trail
  // console.log('Creating change logs...')
  // await prisma.changeLog.create({
  //   data: {
  //     entity: 'PROJECT',
  //     entityId: project1.id,
  //     field: 'created',
  //     toValue: { name: project1.name, description: project1.description },
  //     state: 'CREATED',
  //     changedById: pmUser.id,
  //   },
  // })

  // console.log('Database seed completed successfully!')
  // console.log('Created:')
  // console.log(`- ${await prisma.user.count()} users`)
  // console.log(`- ${await prisma.person.count()} people`)
  // console.log(`- ${await prisma.competency.count()} competencies`)
  // console.log(`- ${await prisma.personCompetency.count()} person competencies`)
  // console.log(`- ${await prisma.course.count()} courses`)
  // console.log(`- ${await prisma.courseEnrollment.count()} course enrollments`)
  // console.log(`- ${await prisma.project.count()} projects`)
  // console.log(`- ${await prisma.task.count()} tasks`)
  // console.log(`- ${await prisma.assignment.count()} assignments`)
  // console.log(`- ${await prisma.review.count()} reviews`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })