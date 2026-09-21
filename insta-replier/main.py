#!/usr/bin/env python3
"""
DM every commenter on a given Instagram post whose comment you have not yet
liked, then like their comment.

Uses instagrapi (unofficial Instagram private API). Instagram automation is
against Meta's Terms of Service and can get your account restricted or banned.
Use this script only for your own account, at your own risk, with conservative
rate limits and a non-spammy message.
"""
import argparse
import json
import logging
import os
import random
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from instagrapi import Client
from instagrapi.exceptions import (
    ClientError,
    DirectMessageRequestsDisabled,
    PleaseWaitFewMinutes,
    RateLimitError,
    TwoFactorRequired,
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("insta_replier")

STATE_FILE = Path(os.getenv("STATE_FILE", "state.json"))
SESSION_FILE = Path(os.getenv("SESSION_FILE", "session.json"))


def load_state():
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            data = json.load(f)
        return (
            set(data.get("processed_comment_pks", [])),
            set(data.get("dm_user_ids", [])),
            set(data.get("skipped_user_ids", [])),
        )
    return set(), set(), set()


def save_state(processed_comment_pks, dm_user_ids, skipped_user_ids):
    STATE_FILE.write_text(
        json.dumps(
            {
                "processed_comment_pks": sorted(processed_comment_pks),
                "dm_user_ids": sorted(dm_user_ids),
                "skipped_user_ids": sorted(skipped_user_ids),
            },
            indent=2,
        )
    )


def get_env_or_raise(key):
    value = os.getenv(key)
    if not value:
        raise SystemExit(f"Missing required environment variable: {key}")
    return value


def login(client: Client, username: str, password: str):
    if SESSION_FILE.exists():
        try:
            client.load_settings(str(SESSION_FILE))
            logger.info("Loaded existing session from %s", SESSION_FILE)
        except Exception as e:
            logger.warning("Could not load session: %s", e)

    try:
        client.login(username, password)
    except TwoFactorRequired:
        logger.info("Two-factor authentication required.")
        code = input("Enter 2FA code: ").strip()
        client.login(username, password, verification_code=code)
    except Exception as e:
        logger.exception("Login failed: %s", e)
        raise

    client.dump_settings(str(SESSION_FILE))
    logger.info("Session saved to %s", SESSION_FILE)


def fetch_comments(client: Client, media_pk: str, max_comments: int = 0):
    logger.info("Fetching comments for media pk %s ...", media_pk)
    comments = client.media_comments(media_pk, amount=max_comments)
    logger.info("Fetched %d comments", len(comments))
    return comments


def personalize(message: str, user) -> str:
    return (
        message.replace("{username}", user.username or "")
        .replace("{full_name}", user.full_name or "")
    )


def process_comments(
    client: Client,
    comments,
    message: str,
    dry_run: bool = False,
    delay_min: float = 5.0,
    delay_max: float = 15.0,
    long_break_every: int = 50,
    long_break_seconds: float = 300.0,
):
    processed_pks, dm_user_ids, skipped_user_ids = load_state()
    own_user_id = str(client.user_id)

    action_count = 0

    for comment in comments:
        comment_pk = str(comment.pk)
        user = comment.user
        user_id = str(user.pk)

        # Skip your own comments.
        if user_id == own_user_id:
            logger.debug("Skipping own comment %s", comment_pk)
            continue

        # Skip comments that were already handled in a previous run.
        if comment_pk in processed_pks:
            continue

        # If you already liked the comment, treat it as handled and do not DM.
        if getattr(comment, "has_liked", None) is True:
            logger.info(
                "Comment %s already liked; skipping %s",
                comment_pk,
                user.username,
            )
            processed_pks.add(comment_pk)
            save_state(processed_pks, dm_user_ids, skipped_user_ids)
            continue

        personalized = personalize(message, user)

        # DM this user once, even if they left multiple comments.
        dm_sent = False
        if user_id in dm_user_ids:
            dm_sent = True
            logger.info(
                "Already DM'd user %s; will only like comment %s",
                user.username,
                comment_pk,
            )
        elif user_id not in skipped_user_ids:
            logger.info(
                "%s DM to %s (%s) for comment %s",
                "[DRY RUN] Would send" if dry_run else "Sending",
                user.username,
                user_id,
                comment_pk,
            )
            if not dry_run:
                try:
                    client.direct_send(personalized, user_ids=[int(user_id)])
                    dm_user_ids.add(user_id)
                    dm_sent = True
                except DirectMessageRequestsDisabled:
                    logger.warning(
                        "User %s does not accept DMs; skipping", user.username
                    )
                    skipped_user_ids.add(user_id)
                except (PleaseWaitFewMinutes, RateLimitError) as e:
                    logger.error(
                        "Rate limit hit: %s. Stopping so you can resume later.", e
                    )
                    save_state(processed_pks, dm_user_ids, skipped_user_ids)
                    raise
                except ClientError as e:
                    logger.error("Failed to DM %s: %s", user.username, e)
                    # Leave user unmarked so a later comment from them can retry.
                    continue
                time.sleep(random.uniform(delay_min, delay_max))

        # Only like the comment if a DM was actually sent (now or previously).
        if dm_sent:
            logger.info(
                "%s like on comment %s",
                "[DRY RUN] Would send" if dry_run else "Sending",
                comment_pk,
            )
            if not dry_run:
                try:
                    client.comment_like(int(comment.pk))
                except ClientError as e:
                    logger.error("Failed to like comment %s: %s", comment_pk, e)
                processed_pks.add(comment_pk)
                save_state(processed_pks, dm_user_ids, skipped_user_ids)

        action_count += 1
        if action_count % long_break_every == 0 and not dry_run:
            logger.info(
                "Taking a long break (%ss) after %d actions...",
                long_break_seconds,
                action_count,
            )
            time.sleep(long_break_seconds)

    logger.info(
        "Done. Processed %d comments. State saved to %s",
        action_count,
        STATE_FILE,
    )


def main():
    parser = argparse.ArgumentParser(
        description="DM Instagram commenters and like their comments."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log what would be done without sending DMs or likes.",
    )
    parser.add_argument(
        "--max-comments",
        type=int,
        default=int(os.getenv("MAX_COMMENTS", "0")),
        help="Maximum comments to process (0 = all).",
    )
    parser.add_argument(
        "--delay-min",
        type=float,
        default=float(os.getenv("DELAY_MIN", "5")),
        help="Minimum seconds between DM sends.",
    )
    parser.add_argument(
        "--delay-max",
        type=float,
        default=float(os.getenv("DELAY_MAX", "15")),
        help="Maximum seconds between DM sends.",
    )
    parser.add_argument(
        "--reset-state",
        action="store_true",
        help="Delete the state file before running (start from scratch).",
    )
    args = parser.parse_args()

    if args.reset_state and STATE_FILE.exists():
        logger.warning("Resetting state file %s", STATE_FILE)
        STATE_FILE.unlink()

    username = get_env_or_raise("INSTAGRAM_USERNAME")
    password = get_env_or_raise("INSTAGRAM_PASSWORD")
    post_url = os.getenv("POST_URL")
    media_pk_env = os.getenv("MEDIA_PK")
    if not post_url and not media_pk_env:
        raise SystemExit("Missing required environment variable: POST_URL or MEDIA_PK")
    message = get_env_or_raise("DM_MESSAGE")

    long_break_every = int(os.getenv("LONG_BREAK_EVERY", "50"))
    long_break_seconds = float(os.getenv("LONG_BREAK_SECONDS", "300"))

    proxy = os.getenv("PROXY")
    client = Client(proxy=proxy) if proxy else Client()
    if proxy:
        logger.info("Using proxy %s", proxy)
    login(client, username, password)

    media_pk = client.media_pk_from_url(post_url) if post_url else str(media_pk_env)
    comments = fetch_comments(client, media_pk, max_comments=args.max_comments)
    process_comments(
        client,
        comments,
        message,
        dry_run=args.dry_run,
        delay_min=args.delay_min,
        delay_max=args.delay_max,
        long_break_every=long_break_every,
        long_break_seconds=long_break_seconds,
    )


if __name__ == "__main__":
    main()
