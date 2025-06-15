---
title: 'Privacy, Logging, and Data Collection'
subtitle: Making sure your data is safe
headline: 'Privacy, Logging, and Data Collection | Keeping your data safe'
canonical-url: 'https://openrouter.ai/docs/features/privacy-and-logging'
'og:site_name': OpenRouter Documentation
'og:title': 'Privacy, Logging, and Data Collection | Keeping your data safe'
'og:description': >-
  Learn how OpenRouter & its providers handle your data, including logging and
  data collection.
'og:image':
  type: url
  value: >-
    https://openrouter.ai/dynamic-og?pathname=features/privacy-and-logging&title=Privacy,%20Logging,%20and%20Data%20Collection&description=Learn%20how%20OpenRouter%20handles%20your%20data,%20including%20logging%20and%20data%20collection.
'og:image:width': 1200
'og:image:height': 630
'twitter:card': summary_large_image
'twitter:site': '@OpenRouterAI'
noindex: false
nofollow: false
---

import { ProviderDataRetentionTable } from '../../../imports/ProviderDataRetentionTable';

When using AI through OpenRouter, whether via the chat interface or the API, your prompts and responses go through multiple touchpoints. You have control over how your data is handled at each step.

This page is designed to give a practical overview of how your data is handled, stored, and used. More information is available in the [privacy policy](/privacy) and [terms of service](/terms).

## Within OpenRouter

OpenRouter does not store your prompts or responses, _unless_ you have explicitly opted in to prompt logging in your account settings. It's as simple as that.

OpenRouter samples a small number of prompts for categorization to power our reporting and model ranking. If you are not opted in to prompt logging, any categorization of your prompts is stored completely anonymously and never associated with your account or user ID. The categorization is done by model with a zero-data-retention policy.

OpenRouter does store metadata (e.g. number of prompt and completion tokens, latency, etc) for each request. This is used to power our reporting and model ranking, and your [activity feed](/activity).

## Provider Policies

### Training on Prompts

Each provider on OpenRouter has its own data handling policies. We reflect those policies in structured data on each AI endpoint that we offer.

On your account settings page, you can set whether you would like to allow routing to providers that may train on your data (according to their own policies). There are separate settings for paid and free models.

Wherever possible, OpenRouter works with providers to ensure that prompts will not be trained on, but there are exceptions. If you opt out of training in your account settings, OpenRouter will not route to providers that train. This setting has no bearing on OpenRouter's own policies and what we do with your prompts.

<Tip title='Data Policy Filtering'>
  You can [restrict individual requests](/docs/features/provider-routing#requiring-providers-to-comply-with-data-policies)
  to only use providers with a certain data policy.

  This is also available as an account-wide setting in [your privacy settings](https://openrouter.ai/settings/privacy).
</Tip>

### Data Retention & Logging

Providers also have their own data retention policies, often for compliance reasons. OpenRouter does not have routing rules that change based on data retention policies of providers, but the retention policies as reflected in each provider's terms are shown below. Any user of OpenRouter can ignore providers that don't meet their own data retention requirements.

The full terms of service for each provider are linked from the provider's page, and aggregated in the [documentation](/docs/features/provider-routing#terms-of-service).

<ProviderDataRetentionTable />
