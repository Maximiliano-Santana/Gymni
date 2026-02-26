# Gym&i App

Gym&i es una app SaaS multi tenant basada en subdominios para gestionar gimnasios. El nombre denota que nuestro principal objetivo es crear un lazo de confianza entre los gimnasios y sus clientes, ofreciendo herramientas para mejorar la experiencia del cliente y la eficiencia operativa del gimnasio.

Las principales funcionalidades son:
- Panel de administración para los gimnasios, que permita gestionar sus clientes, su staff, sus membresías, sus entrenamientos y sus dietas.
- Panel de miembros para visulizar progreso, entrenamientos, dietas y membresías.

## Tecnologías
- App fullstack con Next.js 15
- NextAuth para autenticación
- Prisma para ORM
- TailwindCSS para estilos
- Shadcn UI para componentes
- Zod para validación
- Zustand para state management
- Base de datos Postgres

## Arquitectura

Para el MVP, la arquitectura es simple y es una aplicacion monolítica, con una estructura FSD (Feature Sliced Design).

En el futuro, la arquitectura se convertira en una aplicacion multi tenant, con una estructura de microservicios.

# Documentación


## Multi Tenant

La arquitectura multi tenant se basa en subdominios, por lo que cada gimnasio tendra su propio subdominio con su propia configuración. 

Para el MVP, habrá una base de datos compartida para todos los gimnasios, 

