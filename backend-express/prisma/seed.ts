import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  await prisma.auditHistory.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.notificationConfig.deleteMany();

  // Seed Notification Config
  await prisma.notificationConfig.create({
    data: {
      adGroupName: 'IT_Governance',
      additionalEmailRecipients: null,
    },
  });

  // Seed Hardware Inventory Items
  const hardwareItems = [
    {
      itemNumber: 'HW-001',
      assetType: 'Hardware',
      description: 'Dell Latitude 7420 Laptop',
      category: 'Laptop',
      hardwareDescription: 'Dell Latitude 7420 Laptop',
      hardwareType: 'Laptop',
      cost: 1200.00,
      currentQuantity: 15,
      minimumThreshold: 10,
      reorderAmount: 20,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'HW-002',
      assetType: 'Hardware',
      description: 'HP EliteBook 840 G8',
      category: 'Laptop',
      hardwareDescription: 'HP EliteBook 840 G8',
      hardwareType: 'Laptop',
      cost: 1350.00,
      currentQuantity: 8,
      minimumThreshold: 10,
      reorderAmount: 15,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'HW-003',
      assetType: 'Hardware',
      description: 'Logitech MX Keys Keyboard',
      category: 'Keyboard',
      hardwareDescription: 'Logitech MX Keys Keyboard',
      hardwareType: 'Keyboard',
      cost: 99.99,
      currentQuantity: 25,
      minimumThreshold: 15,
      reorderAmount: 30,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'HW-004',
      assetType: 'Hardware',
      description: 'Dell UltraSharp 27" Monitor',
      category: 'Monitor',
      hardwareDescription: 'Dell UltraSharp 27" Monitor',
      hardwareType: 'Monitor',
      cost: 450.00,
      currentQuantity: 12,
      minimumThreshold: 8,
      reorderAmount: 10,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'HW-005',
      assetType: 'Hardware',
      description: 'Jabra Evolve 75 Headset',
      category: 'Headset',
      hardwareDescription: 'Jabra Evolve 75 Headset',
      hardwareType: 'Headset',
      cost: 299.00,
      currentQuantity: 5,
      minimumThreshold: 10,
      reorderAmount: 20,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'HW-006',
      assetType: 'Hardware',
      description: 'Logitech C920 HD Webcam',
      category: 'Webcam',
      hardwareDescription: 'Logitech C920 HD Webcam',
      hardwareType: 'Webcam',
      cost: 79.99,
      currentQuantity: 18,
      minimumThreshold: 12,
      reorderAmount: 25,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'HW-007',
      assetType: 'Hardware',
      description: 'Dell WD19TB Docking Station',
      category: 'Docking Station',
      hardwareDescription: 'Dell WD19TB Docking Station',
      hardwareType: 'Docking Station',
      cost: 280.00,
      currentQuantity: 10,
      minimumThreshold: 8,
      reorderAmount: 15,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'HW-008',
      assetType: 'Hardware',
      description: 'HP Z2 Tower G9 Workstation',
      category: 'Desktop',
      hardwareDescription: 'HP Z2 Tower G9 Workstation',
      hardwareType: 'Desktop',
      cost: 1800.00,
      currentQuantity: 6,
      minimumThreshold: 5,
      reorderAmount: 8,
      lastModifiedBy: 'System',
    },
  ];

  // Seed Software Inventory Items
  const softwareItems = [
    {
      itemNumber: 'SW-001',
      assetType: 'Software',
      description: 'Zoom Pro License',
      category: 'License',
      hardwareDescription: null,
      hardwareType: null,
      cost: 149.90,
      currentQuantity: 100,
      minimumThreshold: 50,
      reorderAmount: 100,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'SW-002',
      assetType: 'Software',
      description: 'Adobe Creative Cloud License',
      category: 'License',
      hardwareDescription: null,
      hardwareType: null,
      cost: 599.88,
      currentQuantity: 25,
      minimumThreshold: 20,
      reorderAmount: 30,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'SW-003',
      assetType: 'Software',
      description: 'Microsoft Visio Professional',
      category: 'License',
      hardwareDescription: null,
      hardwareType: null,
      cost: 579.99,
      currentQuantity: 15,
      minimumThreshold: 10,
      reorderAmount: 20,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'SW-004',
      assetType: 'Software',
      description: 'ServiceNow User License',
      category: 'License',
      hardwareDescription: null,
      hardwareType: null,
      cost: 100.00,
      currentQuantity: 75,
      minimumThreshold: 50,
      reorderAmount: 50,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'SW-005',
      assetType: 'Software',
      description: 'Laserfiche Enterprise License',
      category: 'License',
      hardwareDescription: null,
      hardwareType: null,
      cost: 250.00,
      currentQuantity: 40,
      minimumThreshold: 30,
      reorderAmount: 40,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'SW-006',
      assetType: 'Software',
      description: 'Microsoft Project Professional',
      category: 'License',
      hardwareDescription: null,
      hardwareType: null,
      cost: 679.99,
      currentQuantity: 12,
      minimumThreshold: 10,
      reorderAmount: 15,
      lastModifiedBy: 'System',
    },
    {
      itemNumber: 'SW-007',
      assetType: 'Software',
      description: 'LinkedIn Learning License',
      category: 'License',
      hardwareDescription: null,
      hardwareType: null,
      cost: 299.88,
      currentQuantity: 200,
      minimumThreshold: 150,
      reorderAmount: 100,
      lastModifiedBy: 'System',
    },
  ];

  const allItems = [...hardwareItems, ...softwareItems];

  for (const item of allItems) {
    await prisma.inventory.create({
      data: item,
    });
  }

  // Seed Audit History
  const inventoryItems = await prisma.inventory.findMany();

  const auditEntries = [
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'HW-001')!.id,
      previousQuantity: 20,
      newQuantity: 15,
      changedBy: 'john.doe',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012345',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'HW-002')!.id,
      previousQuantity: 12,
      newQuantity: 8,
      changedBy: 'jane.smith',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012346',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'HW-005')!.id,
      previousQuantity: 15,
      newQuantity: 5,
      changedBy: 'admin',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012347',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'SW-001')!.id,
      previousQuantity: 150,
      newQuantity: 100,
      changedBy: 'john.doe',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012348',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'SW-002')!.id,
      previousQuantity: 30,
      newQuantity: 25,
      changedBy: 'jane.smith',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012349',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'HW-003')!.id,
      previousQuantity: 30,
      newQuantity: 25,
      changedBy: 'admin',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012350',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'HW-004')!.id,
      previousQuantity: 15,
      newQuantity: 12,
      changedBy: 'john.doe',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012351',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'HW-006')!.id,
      previousQuantity: 22,
      newQuantity: 18,
      changedBy: 'jane.smith',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012352',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'SW-003')!.id,
      previousQuantity: 20,
      newQuantity: 15,
      changedBy: 'admin',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012353',
    },
    {
      itemId: inventoryItems.find(i => i.itemNumber === 'HW-008')!.id,
      previousQuantity: 10,
      newQuantity: 6,
      changedBy: 'john.doe',
      serviceNowTicketUrl: 'https://servicenow.company.com/ticket/INC0012354',
    },
  ];

  for (const audit of auditEntries) {
    await prisma.auditHistory.create({
      data: audit,
    });
  }

  console.log('Database seeded successfully!');
  console.log(`Created ${allItems.length} inventory items`);
  console.log(`Created ${auditEntries.length} audit history entries`);
  console.log('Created 1 notification config');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
