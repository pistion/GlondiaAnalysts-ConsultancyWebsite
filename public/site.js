/**
 * Shared site behavior
 * - Mobile nav
 * - Current-page nav state
 * - Filter chips
 * - Footer year
 * - Apply and contact form submissions
 */

const API_BASE = "";

document.addEventListener("DOMContentLoaded", () => {
  const showFormStatus = (element, message, state = "idle") => {
    if (!element) return;
    element.textContent = message;
    if (state === "idle") {
      element.removeAttribute("data-state");
      return;
    }
    element.setAttribute("data-state", state);
  };

  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");
  if (hamburger && mobileMenu) {
    const mobileSubmenus = Array.from(mobileMenu.querySelectorAll(".mobile-menu__submenu"));
    const collapseMobileSubmenus = () => {
      mobileSubmenus.forEach(submenu => {
        submenu.classList.remove("open");
        submenu.setAttribute("aria-hidden", "true");
      });

      mobileMenu.querySelectorAll(".mobile-menu__toggle").forEach(button => {
        button.setAttribute("aria-expanded", "false");
      });
    };

    hamburger.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", String(open));
      if (!open) {
        collapseMobileSubmenus();
      }
    });

    mobileMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        collapseMobileSubmenus();
      });
    });

    mobileMenu.querySelectorAll(".mobile-menu__toggle").forEach(button => {
      const targetId = button.getAttribute("aria-controls");
      const target = targetId ? document.getElementById(targetId) : null;
      if (!target) return;

      button.addEventListener("click", () => {
        const nextExpanded = button.getAttribute("aria-expanded") !== "true";

        mobileSubmenus.forEach(submenu => {
          const isCurrent = submenu === target;
          submenu.classList.toggle("open", isCurrent && nextExpanded);
          submenu.setAttribute("aria-hidden", String(!(isCurrent && nextExpanded)));
        });

        mobileMenu.querySelectorAll(".mobile-menu__toggle").forEach(otherButton => {
          otherButton.setAttribute("aria-expanded", String(otherButton === button && nextExpanded));
        });
      });
    });
  }

  const currentPath = (location.pathname.replace(/^\/+/, "").replace(/\.html$/, "") || "index");
  document.querySelectorAll("a.nav__link, a.mobile-menu__link").forEach(link => {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#")) return;
    const normalizedHref = href.replace(/^\/+/, "").replace(/\.html$/, "") || "index";
    const isActive = normalizedHref === currentPath || currentPath.startsWith(`${normalizedHref}/`);
    if (isActive) {
      link.classList.add("is-active");
    }
  });

  document.querySelectorAll(".filters").forEach(filterGroup => {
    const chips = Array.from(filterGroup.querySelectorAll(".chip"));
    const grid = filterGroup.parentElement?.querySelector(".grid");
    const cards = grid ? Array.from(grid.querySelectorAll(".card")) : [];
    if (!chips.length || !cards.length) return;

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(item => item.classList.remove("is-active"));
        chip.classList.add("is-active");

        const filter = chip.dataset.filter || "all";
        cards.forEach(card => {
          const cardTags = card.dataset.tags || "";
          const show = filter === "all" || cardTags.includes(filter);
          card.style.display = show ? "" : "none";
        });
      });
    });
  });

  const projectToggleGroups = new Map();
  document.querySelectorAll(".project-toggle").forEach(button => {
    const targetId = button.getAttribute("aria-controls");
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target || !targetId) return;

    if (!projectToggleGroups.has(targetId)) {
      projectToggleGroups.set(targetId, { target, buttons: [] });
    }

    projectToggleGroups.get(targetId).buttons.push(button);
  });

  const setProjectGroupExpanded = (group, nextExpanded) => {
    group.target.setAttribute("aria-hidden", String(!nextExpanded));
    group.card?.classList.toggle("is-expanded", nextExpanded);

    group.buttons.forEach(control => {
      control.setAttribute("aria-expanded", String(nextExpanded));

      const showLabel = control.dataset.showLabel;
      const hideLabel = control.dataset.hideLabel;
      if (showLabel && hideLabel) {
        control.setAttribute("aria-label", nextExpanded ? hideLabel : showLabel);
      }

      const textEl = control.querySelector("[data-toggle-text]");
      const showText = control.dataset.showText;
      const hideText = control.dataset.hideText;
      if (textEl && showText && hideText) {
        textEl.textContent = nextExpanded ? hideText : showText;
      }
    });
  };

  projectToggleGroups.forEach(group => {
    group.card = group.buttons[0]?.closest(".card");

    group.buttons.forEach(control => {
      control.addEventListener("click", () => {
        const isExpanded = control.getAttribute("aria-expanded") === "true";
        const nextExpanded = !isExpanded;

        if (nextExpanded) {
          projectToggleGroups.forEach(otherGroup => {
            if (otherGroup !== group) {
              setProjectGroupExpanded(otherGroup, false);
            }
          });
        }

        setProjectGroupExpanded(group, nextExpanded);
      });
    });
  });

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const applyBtn = document.getElementById("apply-btn");
  if (applyBtn && applyBtn.tagName === "BUTTON") {
    applyBtn.addEventListener("click", () => {
      window.location.href = "/apply";
    });
  }

  const contactRailStatus = document.getElementById("contact-rail-status");
  const setContactRailStatus = (message, state = "idle") => {
    if (!contactRailStatus) return;
    contactRailStatus.textContent = message;
    if (state === "idle") {
      contactRailStatus.removeAttribute("data-state");
      return;
    }
    contactRailStatus.setAttribute("data-state", state);
  };

  const currentPageUrl = window.location.href;
  const encodedPageUrl = encodeURIComponent(currentPageUrl);
  const encodedTitle = encodeURIComponent(document.title);
  document.querySelectorAll("[data-share-network]").forEach(control => {
    const network = control.getAttribute("data-share-network");
    if (!network) return;

    if (control.tagName === "A") {
      if (network === "facebook") {
        control.setAttribute("href", `https://www.facebook.com/sharer/sharer.php?u=${encodedPageUrl}`);
      }
      if (network === "linkedin") {
        control.setAttribute("href", `https://www.linkedin.com/sharing/share-offsite/?url=${encodedPageUrl}`);
      }
      if (network === "telegram") {
        control.setAttribute("href", `https://t.me/share/url?url=${encodedPageUrl}&text=${encodedTitle}`);
      }
    }

    if (network !== "system") return;

    control.addEventListener("click", async event => {
      event.preventDefault();

      if (navigator.share) {
        try {
          await navigator.share({
            title: document.title,
            text: "Connect with Glondia.",
            url: currentPageUrl,
          });
          setContactRailStatus("Sharing options opened.", "success");
        } catch (error) {
          if (error?.name !== "AbortError") {
            setContactRailStatus("Sharing was not completed.", "warning");
          }
        }
        return;
      }

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(currentPageUrl);
          setContactRailStatus("Page link copied.", "success");
        } catch (error) {
          setContactRailStatus("Unable to copy the link just now.", "error");
        }
        return;
      }

      setContactRailStatus("Sharing is not available in this browser.", "warning");
    });
  });

  document.querySelectorAll("[data-copy-url]").forEach(button => {
    button.addEventListener("click", async () => {
      const copyPath = button.getAttribute("data-copy-url");
      if (!copyPath) return;

      const fallbackText = button.dataset.copyDefault || button.textContent || "Copy Link";
      const successText = button.getAttribute("data-copy-label") || "Link copied.";
      const failureText = "Copy unavailable";

      if (!button.dataset.copyDefault) {
        button.dataset.copyDefault = fallbackText;
      }

      try {
        const absoluteUrl = new URL(copyPath, window.location.origin).href;
        await navigator.clipboard.writeText(absoluteUrl);
        button.textContent = successText;
      } catch (error) {
        button.textContent = failureText;
      }

      window.setTimeout(() => {
        button.textContent = button.dataset.copyDefault || fallbackText;
      }, 1800);
    });
  });

  document.querySelectorAll("[data-article-card]").forEach(card => {
    const articleSlug = card.getAttribute("data-article-card");
    const articleHref = card.getAttribute("data-article-href");
    if (!articleSlug) return;

    const viewsEl = card.querySelector("[data-article-card-views]");
    const likesEl = card.querySelector("[data-article-card-likes]");
    const commentsEl = card.querySelector("[data-article-card-comments]");

    fetch(`${API_BASE}/api/articles/${encodeURIComponent(articleSlug)}/stats`)
      .then(response => response.json())
      .then(payload => {
        const counts = payload?.counts || {};
        if (viewsEl) {
          viewsEl.textContent = String(counts.uniqueViews || 0);
        }
        if (likesEl) {
          likesEl.textContent = String(counts.likes || 0);
        }
        if (commentsEl) {
          commentsEl.textContent = String(counts.comments || 0);
        }
      })
      .catch(() => {
        if (viewsEl) viewsEl.textContent = "0";
        if (likesEl) likesEl.textContent = "0";
        if (commentsEl) commentsEl.textContent = "0";
      });

    if (!articleHref) return;

    card.addEventListener("click", event => {
      if (event.target.closest("a, button")) return;
      window.location.href = new URL(articleHref, document.baseURI).href;
    });
  });

  const articleFeature = document.querySelector("#page--articles .article-feature");
  if (articleFeature) {
    const articleId = articleFeature.getAttribute("data-article-id") || "article";
    const articleTitle = articleFeature.getAttribute("data-article-title") || document.title;
    const discussionUrl = `${API_BASE}/api/articles/${encodeURIComponent(articleId)}/discussion`;
    const commentsUrl = `${API_BASE}/api/articles/${encodeURIComponent(articleId)}/comments`;
    const reactionsUrl = `${API_BASE}/api/articles/${encodeURIComponent(articleId)}/reactions`;
    const sharesUrl = `${API_BASE}/api/articles/${encodeURIComponent(articleId)}/shares`;
    const readerButton = document.querySelector("[data-article-reader]");
    const commentsJumpButton = document.querySelector("[data-article-comments-jump]");
    const commentsPanel = document.getElementById("article-comments");
    const shareOpenButton = document.querySelector("[data-article-share-open]");
    const shareModal = document.getElementById("article-share-modal");
    const shareLinkInput = document.getElementById("article-share-link");
    const shareStatus = document.getElementById("article-share-status");
    const shareCopyButton = document.querySelector("[data-article-share-copy]");
    const commentForm = document.getElementById("article-comment-form");
    const commentNameInput = document.getElementById("article-comment-name");
    const commentEmailInput = document.getElementById("article-comment-email");
    const commentMessageInput = document.getElementById("article-comment-message");
    const commentStatus = document.getElementById("article-comment-status");
    const commentsList = document.getElementById("article-comments-list");
    const commentCount = document.querySelector("[data-article-comment-count]");
    const commentSubmitButton = document.getElementById("article-comment-submit");
    const commentCancelButton = document.getElementById("article-comment-cancel");
    const reactionButtons = Array.from(document.querySelectorAll("[data-article-react]"));
    const reactionCountUp = document.querySelector('[data-article-react-count="up"]');
    const reactionCountDown = document.querySelector('[data-article-react-count="down"]');
    const statLikes = document.querySelector("[data-article-stat-likes]");
    const statComments = document.querySelector("[data-article-stat-comments]");
    const statShares = document.querySelector("[data-article-stat-shares]");
    const uniqueViewsCount = document.querySelector("[data-article-unique-views]");

    const readerStorageKey = `glondia.article.reader.${articleId}`;
    const shareUrl = window.location.href;
    const encodedShareUrl = encodeURIComponent(shareUrl);
    const encodedShareTitle = encodeURIComponent(articleTitle);

    let editingCommentId = null;
    let pendingCommentId = null;
    let discussionState = {
      counts: { uniqueViews: 0, likes: 0, comments: 0, shares: 0, up: 0, down: 0 },
      viewer: { reaction: "" },
      comments: [],
    };

    const requestArticleJson = async (url, options = {}) => {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Article request failed.");
      }

      return result;
    };

    const setReaderMode = enabled => {
      document.body.classList.toggle("is-reader-mode", enabled);
      if (!readerButton) return;
      readerButton.setAttribute("aria-pressed", String(enabled));
      readerButton.setAttribute("title", enabled ? "Exit reading view" : "Toggle reading view");
    };

    const resetCommentForm = () => {
      editingCommentId = null;
      commentForm?.reset();
      if (commentSubmitButton) {
        commentSubmitButton.textContent = "Post Comment";
      }
      if (commentCancelButton) {
        commentCancelButton.hidden = true;
      }
    };

    const formatCommentDate = value => {
      try {
        return new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch (error) {
        return "";
      }
    };

    const commentInitials = name => {
      const parts = name.trim().split(/\s+/).slice(0, 2);
      return parts.map(part => part.charAt(0)).join("").toUpperCase() || "GA";
    };

    const renderCounts = () => {
      if (uniqueViewsCount) {
        uniqueViewsCount.textContent = String(discussionState.counts.uniqueViews || 0);
      }
      if (reactionCountUp) {
        reactionCountUp.textContent = String(discussionState.counts.up || 0);
      }
      if (reactionCountDown) {
        reactionCountDown.textContent = String(discussionState.counts.down || 0);
      }
      if (commentCount) {
        commentCount.textContent = String(discussionState.counts.comments || 0);
      }
      if (statLikes) {
        statLikes.textContent = String(discussionState.counts.likes || 0);
      }
      if (statComments) {
        statComments.textContent = String(discussionState.counts.comments || 0);
      }
      if (statShares) {
        statShares.textContent = String(discussionState.counts.shares || 0);
      }
    };

    const renderReactions = () => {
      reactionButtons.forEach(button => {
        const kind = button.getAttribute("data-article-react");
        const pressed = discussionState.viewer?.reaction === kind;
        button.setAttribute("aria-pressed", String(pressed));
        const icon = button.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-solid", pressed);
          icon.classList.toggle("fa-regular", !pressed);
        }
      });
    };

    const renderComments = () => {
      if (!commentsList) return;
      commentsList.innerHTML = "";

      if (!discussionState.comments.length) {
        const empty = document.createElement("p");
        empty.className = "article-comments__empty";
        empty.textContent = "No comments yet. Start the discussion with your take on the article.";
        commentsList.appendChild(empty);
        return;
      }

      discussionState.comments.forEach(comment => {
        const item = document.createElement("article");
        item.className = "article-comment";
        if (pendingCommentId && Number(comment.id) === Number(pendingCommentId)) {
          item.classList.add("is-new");
        }

        const top = document.createElement("div");
        top.className = "article-comment__top";

        const identity = document.createElement("div");
        identity.className = "article-comment__identity";

        const avatar = document.createElement("span");
        avatar.className = "article-comment__avatar";
        avatar.textContent = commentInitials(comment.name);

        const meta = document.createElement("div");

        const name = document.createElement("p");
        name.className = "article-comment__name";
        name.textContent = comment.name;

        const email = document.createElement("p");
        email.className = "article-comment__email";
        email.textContent = comment.email;

        const date = document.createElement("p");
        date.className = "article-comment__date";
        const edited = comment.updatedAt && comment.updatedAt !== comment.createdAt ? " · edited" : "";
        date.textContent = `${formatCommentDate(comment.createdAt)}${edited}`;

        meta.appendChild(name);
        meta.appendChild(email);
        meta.appendChild(date);
        identity.appendChild(avatar);
        identity.appendChild(meta);
        top.appendChild(identity);

        if (comment.canManage) {
          const actions = document.createElement("div");
          actions.className = "article-comment__actions";

          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "article-comment__action";
          editButton.textContent = "Edit";
          editButton.setAttribute("data-comment-action", "edit");
          editButton.setAttribute("data-comment-id", String(comment.id));

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "article-comment__action article-comment__action--delete";
          deleteButton.textContent = "Delete";
          deleteButton.setAttribute("data-comment-action", "delete");
          deleteButton.setAttribute("data-comment-id", String(comment.id));

          actions.appendChild(editButton);
          actions.appendChild(deleteButton);
          top.appendChild(actions);
        }

        const message = document.createElement("p");
        message.className = "article-comment__text";
        message.textContent = comment.message;

        item.appendChild(top);
        item.appendChild(message);
        commentsList.appendChild(item);
      });

      pendingCommentId = null;
    };

    const applyDiscussionState = payload => {
      discussionState = {
        counts: payload?.counts || { uniqueViews: 0, likes: 0, comments: 0, shares: 0, up: 0, down: 0 },
        viewer: payload?.viewer || { reaction: "" },
        comments: Array.isArray(payload?.comments) ? payload.comments : [],
      };

      renderCounts();
      renderReactions();
      renderComments();
    };

    const loadDiscussion = async () => {
      try {
        const payload = await requestArticleJson(discussionUrl);
        applyDiscussionState(payload);
      } catch (error) {
        showFormStatus(commentStatus, "Article discussion is not available just now.", "error");
      }
    };

    const recordShare = async network => {
      try {
        const payload = await requestArticleJson(sharesUrl, {
          method: "POST",
          body: { network },
        });
        applyDiscussionState(payload);
      } catch (error) {
        // Keep sharing graceful even if tracking fails.
      }
    };

    let savedReaderMode = false;
    try {
      savedReaderMode = localStorage.getItem(readerStorageKey) === "1";
    } catch (error) {
      savedReaderMode = false;
    }
    setReaderMode(savedReaderMode);

    if (readerButton) {
      readerButton.addEventListener("click", () => {
        const nextEnabled = !document.body.classList.contains("is-reader-mode");
        setReaderMode(nextEnabled);
        try {
          localStorage.setItem(readerStorageKey, nextEnabled ? "1" : "0");
        } catch (error) {
          // Ignore storage issues and keep the UI responsive.
        }
      });
    }

    if (commentsJumpButton && commentsPanel) {
      commentsJumpButton.addEventListener("click", () => {
        commentsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
          commentNameInput?.focus();
        }, 220);
      });
    }

    const openShareModal = () => {
      if (!shareModal) return;
      shareModal.hidden = false;
      if (shareLinkInput) {
        shareLinkInput.value = shareUrl;
      }
      showFormStatus(shareStatus, "");
    };

    const closeShareModal = () => {
      if (!shareModal) return;
      shareModal.hidden = true;
      showFormStatus(shareStatus, "");
    };

    if (shareOpenButton) {
      shareOpenButton.addEventListener("click", openShareModal);
    }

    shareModal?.querySelectorAll("[data-article-share-close]").forEach(control => {
      control.addEventListener("click", closeShareModal);
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && shareModal && !shareModal.hidden) {
        closeShareModal();
      }
    });

    if (shareCopyButton && shareLinkInput) {
      shareCopyButton.addEventListener("click", async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareLinkInput.value);
          } else {
            shareLinkInput.select();
            document.execCommand("copy");
          }

          await recordShare("copy");
          showFormStatus(shareStatus, "Article link copied.", "success");
        } catch (error) {
          showFormStatus(shareStatus, "Unable to copy the article link right now.", "error");
        }
      });
    }

    document.querySelectorAll("[data-article-share-link]").forEach(control => {
      const network = control.getAttribute("data-article-share-link");
      if (!network) return;

      if (control.tagName === "A") {
        if (network === "linkedin") {
          control.setAttribute("href", `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`);
        }
        if (network === "x") {
          control.setAttribute("href", `https://twitter.com/intent/tweet?url=${encodedShareUrl}&text=${encodedShareTitle}`);
        }
        if (network === "facebook") {
          control.setAttribute("href", `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`);
        }
        if (network === "reddit") {
          control.setAttribute("href", `https://www.reddit.com/submit?url=${encodedShareUrl}&title=${encodedShareTitle}`);
        }

        control.addEventListener("click", () => {
          void recordShare(network);
        });
      }

      if (network === "instagram") {
        control.addEventListener("click", async event => {
          event.preventDefault();
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(shareUrl);
            }
            await recordShare("instagram");
            showFormStatus(shareStatus, "Link copied for Instagram sharing.", "success");
          } catch (error) {
            showFormStatus(shareStatus, "Unable to prepare the Instagram share link.", "error");
          }
        });
      }
    });

    reactionButtons.forEach(button => {
      button.addEventListener("click", async () => {
        const kind = button.getAttribute("data-article-react");
        if (!kind) return;

        try {
          const payload = await requestArticleJson(reactionsUrl, {
            method: "POST",
            body: { reaction: kind },
          });
          applyDiscussionState(payload);
        } catch (error) {
          showFormStatus(commentStatus, error.message || "Unable to save your reaction.", "error");
        }
      });
    });

    commentCancelButton?.addEventListener("click", () => {
      resetCommentForm();
      showFormStatus(commentStatus, "");
    });

    commentsList?.addEventListener("click", async event => {
      const actionButton = event.target.closest("[data-comment-action]");
      if (!actionButton) return;

      const action = actionButton.getAttribute("data-comment-action");
      const commentId = Number(actionButton.getAttribute("data-comment-id"));
      if (!Number.isInteger(commentId) || commentId <= 0) return;

      const comment = discussionState.comments.find(item => Number(item.id) === commentId);
      if (!comment) return;

      if (action === "edit") {
        editingCommentId = commentId;
        if (commentNameInput) commentNameInput.value = comment.name || "";
        if (commentEmailInput) commentEmailInput.value = comment.email || "";
        if (commentMessageInput) commentMessageInput.value = comment.message || "";
        if (commentSubmitButton) {
          commentSubmitButton.textContent = "Update Comment";
        }
        if (commentCancelButton) {
          commentCancelButton.hidden = false;
        }
        commentsPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
          commentNameInput?.focus();
        }, 220);
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete this comment?")) {
          return;
        }

        try {
          const payload = await requestArticleJson(`${commentsUrl}/${commentId}`, {
            method: "DELETE",
          });
          applyDiscussionState(payload);
          resetCommentForm();
          showFormStatus(commentStatus, "Comment removed.", "success");
        } catch (error) {
          showFormStatus(commentStatus, error.message || "Unable to delete this comment.", "error");
        }
      }
    });

    if (commentForm) {
      commentForm.addEventListener("submit", async event => {
        event.preventDefault();

        const name = commentNameInput?.value.trim() || "";
        const email = commentEmailInput?.value.trim() || "";
        const message = commentMessageInput?.value.trim() || "";

        if (!name || !email || !message) {
          showFormStatus(commentStatus, "Please add your name, email, and comment.", "error");
          return;
        }

        showFormStatus(commentStatus, editingCommentId ? "Updating comment..." : "Posting comment...");

        try {
          const isEditing = Boolean(editingCommentId);
          const payload = await requestArticleJson(
            isEditing ? `${commentsUrl}/${editingCommentId}` : commentsUrl,
            {
              method: isEditing ? "PUT" : "POST",
              body: { name, email, message },
            }
          );

          pendingCommentId = editingCommentId || payload?.comments?.[0]?.id || null;
          applyDiscussionState(payload);
          resetCommentForm();
          showFormStatus(commentStatus, isEditing ? "Comment updated." : "Comment added.", "success");
        } catch (error) {
          showFormStatus(commentStatus, error.message || "Unable to save your comment.", "error");
        }
      });
    }

    loadDiscussion();
  }

  const anchorLinks = Array.from(
    document.querySelectorAll('a.nav__link[href^="#"], a.mobile-menu__link[href^="#"]')
  );
  const sections = Array.from(document.querySelectorAll("section[id]"));
  if (anchorLinks.length && sections.length) {
    const setActive = id => {
      anchorLinks.forEach(link => {
        link.classList.toggle("is-active", (link.getAttribute("href") || "").slice(1) === id);
      });
    };

    const observer = new IntersectionObserver(entries => {
      let best = { id: null, ratio: 0 };
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > best.ratio) {
          best = { id: entry.target.id, ratio: entry.intersectionRatio };
        }
      }
      if (best.id) {
        setActive(best.id);
      }
    }, { threshold: [0.1, 0.55, 0.9] });

    sections.forEach(section => observer.observe(section));
    const startingId = (location.hash || "").slice(1) || sections[0]?.id;
    if (startingId) {
      setActive(startingId);
    }

    window.addEventListener("hashchange", () => {
      const id = (location.hash || "").slice(1);
      if (id) {
        setActive(id);
      }
    });
  }

  const applyForm = document.getElementById("applyForm");
  if (applyForm) {
    const applyStatus = document.getElementById("apply-status");
    applyForm.addEventListener("submit", async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      showFormStatus(applyStatus, "Submitting your application...");

      try {
        const response = await fetch(`${API_BASE}/api/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Application failed.");
        showFormStatus(applyStatus, result.message || "Application submitted successfully.", "success");
        applyForm.reset();
      } catch (error) {
        console.error("Application error:", error);
        showFormStatus(
          applyStatus,
          error.message || "Failed to submit application. Please try again later.",
          "error"
        );
      }
    });
  }

  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    const contactStatus = document.getElementById("contact-status");
    contactForm.addEventListener("submit", async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      showFormStatus(contactStatus, "Sending your message...");

      try {
        const response = await fetch(`${API_BASE}/api/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Message failed.");
        showFormStatus(contactStatus, result.message || "Message sent successfully.", "success");
        contactForm.reset();
      } catch (error) {
        console.error("Contact error:", error);
        showFormStatus(
          contactStatus,
          error.message || "Failed to send message. Please try again later.",
          "error"
        );
      }
    });
  }
});
