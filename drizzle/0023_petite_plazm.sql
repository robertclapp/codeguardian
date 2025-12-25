CREATE TABLE `branding_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`logo_url` text,
	`favicon_url` text,
	`hero_image_url` text,
	`primary_color` varchar(7) DEFAULT '#3B82F6',
	`secondary_color` varchar(7) DEFAULT '#1E40AF',
	`accent_color` varchar(7) DEFAULT '#10B981',
	`background_color` varchar(7) DEFAULT '#FFFFFF',
	`text_color` varchar(7) DEFAULT '#1F2937',
	`heading_font` varchar(100) DEFAULT 'Inter',
	`body_font` varchar(100) DEFAULT 'Inter',
	`organization_name` varchar(255),
	`tagline` varchar(255),
	`description` text,
	`mission` text,
	`contact_email` varchar(255),
	`contact_phone` varchar(50),
	`address` text,
	`website_url` varchar(500),
	`linkedin_url` varchar(500),
	`twitter_url` varchar(500),
	`facebook_url` varchar(500),
	`instagram_url` varchar(500),
	`show_mission` int DEFAULT 1,
	`show_benefits` int DEFAULT 1,
	`show_team_section` int DEFAULT 0,
	`custom_css` text,
	`benefits` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branding_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollment_id` int NOT NULL,
	`step_id` int NOT NULL,
	`sent_at` timestamp DEFAULT (now()),
	`status` varchar(50) DEFAULT 'sent',
	`opened_at` timestamp,
	`clicked_at` timestamp,
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `email_campaign_logs`;