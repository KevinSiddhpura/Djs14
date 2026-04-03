const { Colors, TextInputStyle, ButtonStyle } = require('discord.js');
const Command = require('../../../handlers/command');
const componentHandler = require('../../../handlers/interactions/componentHandler');
const modalHandler = require('../../../handlers/interactions/modalHandler');
const { CreateMessage, CreateEmbed, CreateComponents, CreateModal } = require('../../../lib/builders');

const UI = {
  menu: 'addon:menu',
  refresh: 'addon:btn:refresh',
  reloadAll: 'addon:btn:reloadall',
  jump: 'addon:btn:jump',
  togglePrefix: 'addon:btn:toggle:',
  reloadPrefix: 'addon:btn:reload:',
  modalJump: 'addon:modal:jump',
  modalInput: 'addon_name',
};

function encodeName(name = '') {
  return encodeURIComponent(name);
}

function decodeName(name = '') {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function getAddonNames(addonHandler) {
  return Array.from(addonHandler.getAllAddons().keys());
}

function pickSelected(addonHandler, preferred) {
  const names = getAddonNames(addonHandler);
  if (!names.length) return null;
  if (preferred && names.includes(preferred)) return preferred;
  return names[0];
}

function buildAddonOptions(addonHandler, selected) {
  return getAddonNames(addonHandler)
    .slice(0, 25)
    .map((name) => {
      const addon = addonHandler.getAddonMetadata(name);
      const status = addon?.enabled ? 'Enabled' : 'Disabled';

      return {
        label: addon?.name || name,
        value: name,
        description: `${status} | v${addon?.version || '0.0.0'}`.slice(0, 100),
        default: selected === name,
      };
    });
}

function buildPanel(addonHandler, selectedName, notice = null) {
  const addons = addonHandler.getAllAddons();
  const selected = selectedName ? addonHandler.getAddonMetadata(selectedName) : null;
  const selectedKey = selectedName && addons.has(selectedName) ? selectedName : null;
  const hasSelection = Boolean(selected && selectedKey);
  const statusLine = hasSelection
    ? (selected.enabled ? 'Enabled' : 'Disabled')
    : 'No addon selected';

  const embed = new CreateEmbed()
    .title('Addon Control Panel')
    .color(hasSelection ? (selected.enabled ? Colors.Green : Colors.Orange) : Colors.Blurple)
    .description(
      hasSelection
        ? `Manage **${selected.name}** from a single command panel.`
        : 'No addons are loaded yet. Drop addon files in the addons folder and reload.'
    )
    .fields([
      {
        name: 'Current Addon',
        value: hasSelection ? `${selected.name} (${selectedKey})` : 'None',
        inline: true,
      },
      {
        name: 'Status',
        value: statusLine,
        inline: true,
      },
      {
        name: 'Loaded Addons',
        value: `${addons.size}`,
        inline: true,
      },
      {
        name: 'Details',
        value: hasSelection
          ? [
            `Developer: ${selected.developer || 'Unknown'}`,
            `Version: ${selected.version || '0.0.0'}`,
            `Commands: ${selected.commands}`,
            `Events: ${selected.events}`,
            `Description: ${selected.description || 'No description'}`,
          ].join('\n')
          : 'Select an addon from the menu to view details.',
        inline: false,
      },
    ])
    .timestamp();

  if (notice) {
    embed.field({ name: 'Action Result', value: notice, inline: false });
  }

  const menu = CreateComponents.stringMenu({
    customId: UI.menu,
    placeholder: addons.size ? 'Select an addon' : 'No addons available',
    options: buildAddonOptions(addonHandler, selectedKey),
    disabled: addons.size === 0,
  });

  const toggleLabel = hasSelection && selected.enabled ? 'Disable' : 'Enable';
  const toggleStyle = hasSelection && selected.enabled ? ButtonStyle.Danger : ButtonStyle.Success;

  const controls = [
    CreateComponents.button({
      customId: `${UI.togglePrefix}${encodeName(selectedKey || '')}`,
      label: toggleLabel,
      style: toggleStyle,
      disabled: !hasSelection,
    }),
    CreateComponents.button({
      customId: `${UI.reloadPrefix}${encodeName(selectedKey || '')}`,
      label: 'Reload',
      style: ButtonStyle.Secondary,
      disabled: !hasSelection,
    }),
    CreateComponents.button({
      customId: UI.reloadAll,
      label: 'Reload All',
      style: ButtonStyle.Primary,
      disabled: addons.size === 0,
    }),
    CreateComponents.button({
      customId: UI.refresh,
      label: 'Refresh',
      style: ButtonStyle.Secondary,
    }),
    CreateComponents.button({
      customId: UI.jump,
      label: 'Jump',
      style: ButtonStyle.Secondary,
      disabled: addons.size === 0,
    }),
  ];

  return {
    embeds: [embed],
    components: [[menu], controls],
  };
}

function getSelectedFromMessage(interaction) {
  try {
    const embed = interaction.message?.embeds?.[0];
    if (!embed?.fields?.length) return null;
    const currentField = embed.fields.find((f) => f.name === 'Current Addon');
    if (!currentField?.value || currentField.value === 'None') return null;
    const key = currentField.value.match(/\(([^)]+)\)$/)?.[1];
    return key || null;
  } catch {
    return null;
  }
}

async function sendPanel(target, addonHandler, selectedName, notice = null, useUpdate = false) {
  const selected = pickSelected(addonHandler, selectedName);
  const payload = buildPanel(addonHandler, selected, notice);

  if (useUpdate) {
    await target.update(new CreateMessage(payload).build());
    return;
  }

  await new CreateMessage({ ...payload, ephemeral: true }).send(target);
}

async function runWithPanelUpdate(client, interaction, action) {
  const addonHandler = client.addonHandler;
  if (!addonHandler) {
    await interaction.reply(new CreateMessage({ content: 'Addon system is not initialized.', ephemeral: true }).build());
    return;
  }

  const selected = getSelectedFromMessage(interaction);
  const result = await action(addonHandler, selected);
  const selectedAfter = pickSelected(addonHandler, result?.selected || selected);
  await sendPanel(interaction, addonHandler, selectedAfter, result?.notice || null, true);
}

new Command({
  name: 'addon',
  category: 'Admin',
  description: 'Open interactive addon manager panel',
  adminOnly: true,
  options: [],

  runSlash: async (client, interaction) => {
    const addonHandler = client.addonHandler;

    if (!addonHandler) {
      await new CreateMessage({
        content: 'Addon system is not initialized.',
        ephemeral: true,
      }).send(interaction);
      return;
    }

    const selected = pickSelected(addonHandler);
    await new CreateMessage({
      ...buildPanel(addonHandler, selected),
      ephemeral: true,
    }).send(interaction);
  }
});

componentHandler.register(UI.menu, async (client, interaction) => {
  const addonHandler = client.addonHandler;
  if (!addonHandler) {
    await interaction.update(new CreateMessage({ content: 'Addon system is not initialized.' }).build());
    return;
  }

  const selected = interaction.values?.[0] || null;
  await sendPanel(interaction, addonHandler, selected, null, true);
});

componentHandler.register(UI.refresh, async (client, interaction) => {
  await runWithPanelUpdate(client, interaction, async (addonHandler, selected) => ({
    selected,
    notice: 'Panel refreshed.',
  }));
});

componentHandler.register(UI.reloadAll, async (client, interaction) => {
  await runWithPanelUpdate(client, interaction, async (addonHandler, selected) => {
    const names = getAddonNames(addonHandler);
    let successCount = 0;
    let failCount = 0;

    for (const name of names) {
      const success = await addonHandler.reloadAddon(name);
      if (success) successCount += 1;
      else failCount += 1;
    }

    return {
      selected,
      notice: failCount > 0
        ? `Reloaded ${successCount} addon(s), failed ${failCount}.`
        : `Reloaded ${successCount} addon(s).`,
    };
  });
});

componentHandler.register(UI.jump, async (client, interaction) => {
  const modal = new CreateModal(UI.modalJump, 'Jump To Addon')
    .textInput({
      customId: UI.modalInput,
      label: 'Addon file name (key)',
      style: TextInputStyle.Short,
      placeholder: 'working',
      required: true,
      minLength: 1,
      maxLength: 80,
    });

  await modal.show(interaction);
});

componentHandler.registerPrefix(UI.togglePrefix, async (client, interaction) => {
  await runWithPanelUpdate(client, interaction, async (addonHandler, selectedFromPanel) => {
    const encoded = interaction.customId.slice(UI.togglePrefix.length);
    const selected = decodeName(encoded) || selectedFromPanel;
    const addon = selected ? addonHandler.getAddonMetadata(selected) : null;

    if (!addon || !selected) {
      return { selected: null, notice: 'Select an addon first.' };
    }

    const success = addon.enabled
      ? await addonHandler.disableAddon(selected)
      : await addonHandler.enableAddon(selected);

    const actionText = addon.enabled ? 'disable' : 'enable';
    return {
      selected,
      notice: success ? `Successfully updated ${addon.name}.` : `Failed to ${actionText} ${selected}.`,
    };
  });
});

componentHandler.registerPrefix(UI.reloadPrefix, async (client, interaction) => {
  await runWithPanelUpdate(client, interaction, async (addonHandler, selectedFromPanel) => {
    const encoded = interaction.customId.slice(UI.reloadPrefix.length);
    const selected = decodeName(encoded) || selectedFromPanel;
    const addon = selected ? addonHandler.getAddonMetadata(selected) : null;

    if (!addon || !selected) {
      return { selected: null, notice: 'Select an addon first.' };
    }

    const success = await addonHandler.reloadAddon(selected);
    return {
      selected,
      notice: success ? `Reloaded ${addon.name}.` : `Failed to reload ${selected}.`,
    };
  });
});

modalHandler.register(UI.modalJump, async (client, interaction) => {
  const addonHandler = client.addonHandler;
  if (!addonHandler) {
    await interaction.reply(new CreateMessage({ content: 'Addon system is not initialized.', ephemeral: true }).build());
    return;
  }

  const input = interaction.fields.getTextInputValue(UI.modalInput)?.trim();
  const names = getAddonNames(addonHandler);

  if (!input) {
    await interaction.reply(new CreateMessage({ content: 'Please enter an addon name.', ephemeral: true }).build());
    return;
  }

  const selected = names.find((name) => name.toLowerCase() === input.toLowerCase())
    || names.find((name) => name.toLowerCase().includes(input.toLowerCase()));

  if (!selected) {
    await interaction.reply(new CreateMessage({ content: `No addon matched: ${input}`, ephemeral: true }).build());
    return;
  }

  await interaction.reply(new CreateMessage({
    ...buildPanel(addonHandler, selected, `Jumped to ${selected}.`),
    ephemeral: true,
  }).build());
});
