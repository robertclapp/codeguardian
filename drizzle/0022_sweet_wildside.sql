CREATE TABLE `email_campaign_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`candidate_id` int NOT NULL,
	`current_step` int DEFAULT 1,
	`status` varchar(50) DEFAULT 'active',
	`enrolled_at` timestamp DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `email_campaign_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_campaign_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollment_id` int NOT NULL,
	`step_id` int NOT NULL,
	`sent_at` timestamp DEFAULT (now()),
	`status` varchar(50) DEFAULT 'sent',
	`opened_at` timestamp,
	`clicked_at` timestamp,
	CONSTRAINT `email_campaign_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_campaign_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`step_order` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`delay_days` int DEFAULT 0,
	`delay_hours` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `email_campaign_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`trigger_type` varchar(50) NOT NULL,
	`trigger_stage` varchar(100),
	`is_active` boolean DEFAULT true,
	`created_by` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_campaign_enrollments` ADD CONSTRAINT `email_campaign_enrollments_campaign_id_email_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_campaign_enrollments` ADD CONSTRAINT `email_campaign_enrollments_candidate_id_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_campaign_logs` ADD CONSTRAINT `email_campaign_logs_enrollment_id_email_campaign_enrollments_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `email_campaign_enrollments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_campaign_logs` ADD CONSTRAINT `email_campaign_logs_step_id_email_campaign_steps_id_fk` FOREIGN KEY (`step_id`) REFERENCES `email_campaign_steps`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_campaign_steps` ADD CONSTRAINT `email_campaign_steps_campaign_id_email_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns`(`id`) ON DELETE no action ON UPDATE no action;