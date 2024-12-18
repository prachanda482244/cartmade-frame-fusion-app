console.log("js ready");
$(document).ready(function () {
  $(".video-carousle-slides").each(function () {
    const slide = $(this);
    // Ensure initial state on page load
    $(slide).find(".slide-content-minus-icon").hide();
    $(slide)
      .find(".variant-picker-addtocart")
      .addClass("variant-picker-opentoggle");

    $(slide)
      .find(".slide-content-plus-icon")
      .click(() => {
        const variantSelect = $(slide).find(".variant-picker-addtocart");
        const plusIcon = $(slide).find(".slide-content-plus-icon");
        const minusIcon = $(slide).find(".slide-content-minus-icon");

        if (variantSelect.hasClass("variant-picker-opentoggle")) {
          variantSelect.removeClass("variant-picker-opentoggle");
          plusIcon.hide();
          minusIcon.show();
        } else {
          variantSelect.addClass("variant-picker-opentoggle");
          plusIcon.show();
          minusIcon.hide();
        }
      });

    $(slide)
      .find(".slide-content-minus-icon")
      .click(() => {
        const variantSelect = $(slide).find(".variant-picker-addtocart");
        const plusIcon = $(slide).find(".slide-content-plus-icon");
        const minusIcon = $(slide).find(".slide-content-minus-icon");
        variantSelect.addClass("variant-picker-opentoggle");
        plusIcon.show();
        minusIcon.hide();
      });

    const video = $(slide).find(".swiper-video");
    const toggleIcon = $(slide).find(".mute-toggle");

    video.get(0).addEventListener("click", () => {
      if (video.get(0).paused) {
        video.get(0).play();
      } else {
        video.get(0).pause();
      }
    });

    toggleIcon.get(0).addEventListener("click", () => {
      const mutedIcon = toggleIcon.find(".muted-icon");
      const unmutedIcon = toggleIcon.find(".unmuted-icon");

      if (video.get(0).muted) {
        video.get(0).muted = false;
        mutedIcon.addClass("hidden");
        unmutedIcon.removeClass("hidden");
      } else {
        video.get(0).muted = true;
        mutedIcon.removeClass("hidden");
        unmutedIcon.addClass("hidden");
      }
    });

    $(slide)
      .find(".product-add-to-cart")
      .each(function () {
        const button = this;
        button.addEventListener("click", function () {
          const variantId = button.getAttribute("data-variant-id");
          const productId = button.getAttribute("data-product-id");
          console.log(
            "checking variant id or product id",
            variantId,
            productId,
          );
          const idToUse = variantId ? variantId : productId;
          console.log("id to use is", idToUse);

          if (idToUse) {
            addToCart(idToUse);
          } else {
            console.error("No valid ID found for this product.");
          }
        });
      });

    function addToCart(id) {
      const cartdrawer = document.querySelector("cart-drawer");
      console.log("checking add ot cart id herer", id);
      const items = {
        quantity: 1,
        id: id,
      };

      console.log("items to add cart", items);
      $.ajax({
        type: "POST",
        url: "/cart/add.js",
        data: items,
        dataType: "json",
        success: function (data) {
          console.log("Item successfully added to the cart");
          const cart_notification = $("#cart-notification");
          if (cart_notification) {
            $("#cart-notification").addClass("active");
          }
        },
        error: function (err) {
          console.error("Error adding item to the cart:", err);
        },
      });
    }

    let selectedValues = {};
    let recentlySelectedValue = {};
    let previouslySelectedValue = {};
    let selectedVariantId = "";
    function updateOptions(slide) {
      console.log("checking slide names", slide);

      function getGroupsFromDOM(slide) {
        const groups = {};
        slide.querySelectorAll(".option-btn").forEach((button) => {
          const groupName = button.dataset.optionName;
          const optionValue = button.dataset.name;
          if (!groups[groupName]) {
            groups[groupName] = [];
          }
          if (!groups[groupName].includes(optionValue)) {
            groups[groupName].push(optionValue);
          }
        });

        return groups;
      }

      const groups = getGroupsFromDOM(slide);
      console.log("created group list are", groups);
      const variants = $(".variant")
        .toArray()
        .map((el) => ({
          id: el.dataset.id,
          title: el.dataset.title,
          available: el.dataset.available === "true",
        }));

      const { combinations, secondaryCombination } = generateCombinations(
        groups,
        recentlySelectedValue,
        selectedValues,
      );
      console.log(
        "combination checking of selected Value",
        secondaryCombination,
      );

      // Continue with the function to update button states
      updateButtonStates(secondaryCombination, variants, slide);
      const activeSelection = getActiveSelection(slide);
      console.log("checking active selections", activeSelection);
      const activeselectedVariant = variants.find(
        (variant) => variant.title == activeSelection,
      );
      const selectedVariantprouductId = $(slide)
        .find(".product-add-to-cart button")
        .attr("data-product-id");

      if (activeselectedVariant) {
        selectedVariantId = activeselectedVariant.id;
        console.log(
          "final actively selected variant is here",
          selectedVariantId,
        );
        $(slide)
          .find(".variant-add-to-cart")
          .attr("disabled", false)
          .attr("data-variant-id", selectedVariantId);
      } else {
        console.log("No matching variant found.");
      }
    }

    function generateCombinations(
      groups,
      recentlySelectedValue,
      selectedValues,
    ) {
      const { group: recentlyGroup, value: recentlyValue } =
        recentlySelectedValue;
      selectedValues = selectedValues || {};
      const combinations = [];
      const secondaryCombination = [];
      const remainingGroups = Object.keys(groups).filter(
        (group) => !(group in selectedValues) && group !== recentlyGroup,
      );

      let selectedValueCombination = "";
      const values = Object.values(selectedValues);
      selectedValueCombination = values.join("/");

      const storedGroup = Object.keys(selectedValues).find(
        (group) => group !== recentlyGroup,
      );

      const storedGroupValue = selectedValues[storedGroup];
      if (storedGroupValue) {
        Object.entries(groups).forEach(([groupName, groupOptions]) => {
          if (groupName !== storedGroup) {
            groupOptions.forEach((option) => {
              const combination = `${storedGroupValue}/${option}`;
              secondaryCombination.push(combination);
            });
          }
        });
      }

      // If a stored group is found, combine with the recently selected value
      if (storedGroup) {
        const storedGroupOptions = groups[storedGroup];
        storedGroupOptions.forEach((option) => {
          const combination = `${recentlyValue}/${option}`;
          secondaryCombination.push(combination);
        });
      }

      remainingGroups.forEach((group) => {
        const groupOptions = groups[group];
        groupOptions.forEach((option) => {
          secondaryCombination.push(`${selectedValueCombination}/${option}`);
        });
      });

      return {
        combinations,
        secondaryCombination,
      };
    }

    function updateButtonStates(resultCombinations, variants, slide) {
      function isCombinationAvailable(combination, variants) {
        const [group, value] = combination.split("/");
        return variants.some(
          (variant) =>
            variant.title.includes(group) &&
            variant.title.includes(value) &&
            variant.available,
        );
      }

      const availabilityMap = {};
      resultCombinations.forEach((combination) => {
        const [primary, secondary] = combination.split("/");
        if (!availabilityMap[primary]) {
          availabilityMap[primary] = { available: false, combinations: [] };
        }
        if (!availabilityMap[secondary]) {
          availabilityMap[secondary] = { available: false, combinations: [] };
        }

        const available = isCombinationAvailable(combination, variants);
        if (available) {
          availabilityMap[primary].available = true;
          availabilityMap[secondary].available = true;
        }
        availabilityMap[primary].combinations.push({ combination, available });
        availabilityMap[secondary].combinations.push({
          combination,
          available,
        });
      });

      console.log("Updated Availability Map:", availabilityMap);

      // Update the DOM based on availabilityMap
      slide.querySelectorAll(".option-btn").forEach((button) => {
        const optionValue = button.dataset.name;
        const isAvailable = availabilityMap[optionValue]?.available;
        if (isAvailable === false) {
          button.disabled = true;
          button.classList.add("disabled");
          button.classList.add("out-of-stock");
        } else {
          button.disabled = false;
          button.classList.remove("disabled");
          button.classList.remove("out-of-stock");
        }
      });
    }
    function getActiveSelection(slide) {
      const activeValues = [];
      $(slide)
        .find(".option-group")
        .each(function () {
          const groupName = $(this).data("option-group");
          const activeButton = $(this).find(".option-btn.active");

          if (activeButton.length) {
            const activeValue = activeButton.data("name");
            activeValues.push(activeValue);
          }
        });

      const selectionString = activeValues.join(" / ");
      console.log("Selected Combination:", selectionString);
      return selectionString;
    }

    $(slide)
      .find(".option-btn")
      .click(function (e) {
        const $btn = $(this); // The clicked button
        console.log("clicked button", $btn);

        // Fetch data from the closest `.option-group`
        const optionName = $btn
          .closest(".option-group")
          .find(".option-label")
          .data("option-name");
        const optionValue = $btn.data("name");
        console.log("checking clicked option name", optionName);
        console.log("checking option value", optionValue);
        $btn.closest(".option-group").find(".option-btn").removeClass("active");
        $btn.addClass("active");

        // Update the selected value for the clicked option within the corresponding group
        selectedValues[optionName] = optionValue;
        recentlySelectedValue = {
          group: optionName,
          value: optionValue,
        };

        console.log("selected value");
        const selectedSlide = $(slide);
        updateOptions(selectedSlide[0]);
      });
  });
});
