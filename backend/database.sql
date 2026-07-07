-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `nomorWhatsApp` VARCHAR(15) NOT NULL,
    `role` ENUM('SATKER', 'BIDTEKKOM', 'PADAL', 'TEKNISI') NOT NULL DEFAULT 'SATKER',
    `divisi` VARCHAR(100) NULL,
    `foto` VARCHAR(500) NULL,
    `tema` VARCHAR(10) NOT NULL DEFAULT 'light',
    `bahasa` VARCHAR(5) NOT NULL DEFAULT 'id',
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `padalId` VARCHAR(191) NULL,
    `passwordResetToken` VARCHAR(255) NULL,
    `passwordResetExpires` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_padalId_idx`(`padalId`),
    INDEX `User_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` VARCHAR(191) NOT NULL,
    `nomorTiket` VARCHAR(20) NOT NULL,
    `judul` VARCHAR(150) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `kategori` ENUM('HARDWARE', 'SOFTWARE', 'JARINGAN', 'EMAIL', 'WEBSITE', 'LAINNYA') NOT NULL,
    `lokasi` VARCHAR(200) NOT NULL,
    `status` ENUM('PENDING', 'PROSES', 'SELESAI', 'DIBATALKAN', 'DITOLAK') NOT NULL DEFAULT 'PENDING',
    `divisiSatker` VARCHAR(100) NULL,
    `tanggalBuat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tanggalAssign` DATETIME(3) NULL,
    `tanggalSelesai` DATETIME(3) NULL,
    `alasanBatal` VARCHAR(500) NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `padalId` VARCHAR(191) NULL,

    UNIQUE INDEX `Ticket_nomorTiket_key`(`nomorTiket`),
    INDEX `Ticket_creatorId_idx`(`creatorId`),
    INDEX `Ticket_padalId_idx`(`padalId`),
    INDEX `Ticket_status_idx`(`status`),
    INDEX `Ticket_tanggalBuat_idx`(`tanggalBuat`),
    INDEX `Ticket_nomorTiket_idx`(`nomorTiket`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketSequence` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `seq` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `TicketSequence_year_key`(`year`),
    INDEX `TicketSequence_year_idx`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `storedName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Attachment_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rating` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bintang` INTEGER NOT NULL,
    `feedback` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Rating_ticketId_key`(`ticketId`),
    INDEX `Rating_ticketId_idx`(`ticketId`),
    INDEX `Rating_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('TICKET_CREATED', 'TICKET_ASSIGNED', 'TICKET_COMPLETED', 'TICKET_CANCELLED') NOT NULL,
    `ticketNumber` VARCHAR(20) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_isRead_idx`(`userId`, `isRead`),
    INDEX `Notification_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `eventType` ENUM('LOGIN', 'REGISTRATION', 'TICKET_CREATION', 'TICKET_ASSIGNMENT', 'TICKET_COMPLETION', 'TICKET_CANCELLATION', 'TICKET_REJECTION', 'TICKET_RATING', 'USER_SOFT_DELETE', 'ROLE_CHANGE', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'SETTINGS_CHANGE', 'TEAM_ASSIGNMENT', 'TEAM_REMOVAL') NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `actorNama` VARCHAR(100) NOT NULL,
    `targetEntityId` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_actorId_idx`(`actorId`),
    INDEX `AuditLog_eventType_idx`(`eventType`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_targetEntityId_idx`(`targetEntityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSettings` (
    `id` VARCHAR(191) NOT NULL,
    `appName` VARCHAR(100) NOT NULL DEFAULT 'SIGAP',
    `appLogo` VARCHAR(500) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

