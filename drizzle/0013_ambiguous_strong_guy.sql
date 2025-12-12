CREATE TABLE `assessment_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidate_id` int NOT NULL,
	`assessment_id` text NOT NULL,
	`assessment_title` text NOT NULL,
	`provider` varchar(50) NOT NULL,
	`invitation_link` text NOT NULL,
	`status` enum('pending','completed','expired') NOT NULL DEFAULT 'pending',
	`score` int,
	`percentile` int,
	`completed_at` timestamp,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_invitations_id` PRIMARY KEY(`id`)
);
