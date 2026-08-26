import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: [
      { name: "Laptop Lenovo", quantity: 5 },
      { name: "iPhone 15", quantity: 1 },
      { name: "Écran Dell", quantity: 3 },
      { name: "Clavier Logitech", quantity: 10 },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
