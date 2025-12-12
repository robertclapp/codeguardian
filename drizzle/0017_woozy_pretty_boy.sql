CREATE TABLE `saved_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`search_type` varchar(50) NOT NULL,
	`filters` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `saved_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;