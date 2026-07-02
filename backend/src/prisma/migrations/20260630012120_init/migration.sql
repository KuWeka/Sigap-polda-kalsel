-- DropForeignKey
ALTER TABLE `Attachment` DROP FOREIGN KEY `Attachment_ticketId_fkey`;

-- DropForeignKey
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_actorId_fkey`;

-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Rating` DROP FOREIGN KEY `Rating_ticketId_fkey`;

-- DropForeignKey
ALTER TABLE `Rating` DROP FOREIGN KEY `Rating_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Ticket` DROP FOREIGN KEY `Ticket_creatorId_fkey`;

-- DropForeignKey
ALTER TABLE `Ticket` DROP FOREIGN KEY `Ticket_padalId_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_padalId_fkey`;

-- AlterTable
ALTER TABLE `SystemSettings` MODIFY `appName` VARCHAR(100) NOT NULL DEFAULT 'SIGAP';
